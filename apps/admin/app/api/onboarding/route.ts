import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { createServiceClient } from "@/lib/supabase/server";
import {
  OperationInputError,
  assertOperationDateRange,
  operationDate,
  operationPage,
  operationPageData,
  operationSearch,
  operationText,
} from "utils/company-operations";

const client = () => createServiceClient() as any;

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("onboarding:read");
    const supabase = client();
    const params = request.nextUrl.searchParams;
    const pagination = operationPage(params);
    const status = operationText(params.get("status"), "상태", { max: 30 });
    const member = operationSearch(params, "member");
    const dateFrom = operationDate(params.get("dateFrom"), "시작일", false);
    const dateTo = operationDate(params.get("dateTo"), "종료일", false);
    if (dateFrom) assertOperationDateRange(dateFrom, dateTo);

    let requestsQuery = supabase
      .from("onboarding_requests")
      .select(
        `
          *,
          member:members!onboarding_requests_member_id_fkey!inner(
            id, full_name, role, hire_date,
            team:teams!members_team_id_fkey(id, name)
          ),
          checklist:onboarding_checklist_items(*)
        `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (status) requestsQuery = requestsQuery.eq("status", status);
    if (member) {
      requestsQuery = requestsQuery.ilike("member.full_name", `%${member}%`);
    }
    if (dateFrom) requestsQuery = requestsQuery.gte("start_date", dateFrom);
    if (dateTo) requestsQuery = requestsQuery.lte("start_date", dateTo);

    const [requestsResult, membersResult, presetsResult] = await Promise.all([
      requestsQuery.range(pagination.from, pagination.to),
      supabase.from("members").select("id, full_name, role").order("full_name"),
      supabase
        .from("onboarding_checklist_presets")
        .select("*")
        .order("sort_order")
        .order("created_at"),
    ]);
    if (requestsResult.error) throw requestsResult.error;
    if (membersResult.error) throw membersResult.error;
    if (presetsResult.error) throw presetsResult.error;

    const requestPage = operationPageData(requestsResult.data, pagination);
    return NextResponse.json({
      requests: requestPage.items,
      members: membersResult.data ?? [],
      presets: presetsResult.data ?? [],
      total: requestsResult.count ?? 0,
      pagination: requestPage.pagination,
    });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) {
      return NextResponse.json({ error: "Unauthorized" }, { status });
    }
    if (error instanceof OperationInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET /api/onboarding error:", error);
    return NextResponse.json(
      { error: "온보딩 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("onboarding:write");
    const body = (await request.json()) as Record<string, unknown>;
    const { data, error } = await client()
      .from("onboarding_requests")
      .insert({
        member_id: operationText(body.memberId, "직원", { required: true }),
        start_date: operationDate(body.startDate, "온보딩 시작일"),
        note: operationText(body.note, "메모", { max: 2000 }) || null,
        admin_note:
          operationText(body.adminNote, "관리자 메모", { max: 2000 }) || null,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "해당 직원의 온보딩이 이미 진행 중입니다." },
          { status: 409 },
        );
      }
      throw error;
    }
    await writeAdminAuditLog({
      session,
      request,
      action: "onboarding.create",
      targetType: "onboarding_request",
      targetId: data.id,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) {
      return NextResponse.json({ error: "Unauthorized" }, { status });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "온보딩을 등록하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminPermission("onboarding:write");
    const body = (await request.json()) as Record<string, unknown>;
    const action = operationText(body.action, "작업", { required: true });
    const supabase = client();

    if (action.endsWith("_preset")) {
      const presets = supabase.from("onboarding_checklist_presets");
      let presetId = operationText(body.presetId, "체크리스트 항목", {
        required: action !== "add_preset",
      });
      const fields = () => ({
        title: operationText(body.title, "체크 항목", {
          required: true,
          max: 200,
        }),
        description:
          operationText(body.description, "세부내용", { max: 2000 }) || null,
        sort_order: Number.isInteger(Number(body.sortOrder))
          ? Math.max(0, Number(body.sortOrder))
          : 0,
      });

      if (action === "add_preset") {
        const { data, error } = await presets
          .insert(fields())
          .select()
          .single();
        if (error) throw error;
        presetId = data.id;
      } else if (action === "update_preset") {
        const { data, error } = await presets
          .update(fields())
          .eq("id", presetId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("체크리스트 항목을 찾을 수 없습니다.");
      } else if (action === "delete_preset") {
        const { error } = await presets.delete().eq("id", presetId);
        if (error) throw error;
      } else {
        throw new Error("지원하지 않는 작업입니다.");
      }

      await writeAdminAuditLog({
        session,
        request,
        action: `onboarding.${action}`,
        targetType: "onboarding_checklist_preset",
        targetId: presetId,
      });
      return NextResponse.json({ ok: true });
    }

    let targetId = operationText(body.id, "온보딩", { required: true });

    if (action === "update_checklist") {
      const itemId = operationText(body.itemId, "체크 항목", {
        required: true,
      });
      const completed = Boolean(body.isCompleted);
      const { data, error } = await supabase
        .from("onboarding_checklist_items")
        .update({
          is_completed: completed,
          completion_note: completed
            ? operationText(body.completionNote, "완료 메모", { max: 2000 }) ||
              null
            : null,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", itemId)
        .eq("onboarding_request_id", targetId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("체크 항목을 찾을 수 없습니다.");
      targetId = itemId;
    } else if (action === "delete_checklist") {
      const itemId = operationText(body.itemId, "체크 항목", {
        required: true,
      });
      const { error } = await supabase
        .from("onboarding_checklist_items")
        .delete()
        .eq("id", itemId)
        .eq("onboarding_request_id", targetId);
      if (error) throw error;
      targetId = itemId;
    } else if (action === "update") {
      const { data, error } = await supabase
        .from("onboarding_requests")
        .update({
          start_date: operationDate(body.startDate, "온보딩 시작일"),
          note: operationText(body.note, "메모", { max: 2000 }) || null,
          admin_note:
            operationText(body.adminNote, "관리자 메모", { max: 2000 }) || null,
        })
        .eq("id", targetId)
        .eq("status", "in_progress")
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("진행 중인 온보딩만 수정할 수 있습니다.");
    } else if (action === "complete") {
      const { error } = await supabase.rpc("complete_onboarding_request", {
        p_request_id: targetId,
      });
      if (error?.message?.includes("ONBOARDING_CHECKLIST_INCOMPLETE")) {
        throw new Error("완료되지 않은 체크 항목이 있습니다.");
      }
      if (error?.message?.includes("ONBOARDING_REQUEST_NOT_OPEN")) {
        throw new Error("진행 중인 온보딩만 완료할 수 있습니다.");
      }
      if (error) throw error;
    } else if (action === "cancel") {
      const { data, error } = await supabase
        .from("onboarding_requests")
        .update({
          status: "cancelled",
          admin_note:
            operationText(body.reason, "취소 메모", { max: 2000 }) || null,
        })
        .eq("id", targetId)
        .eq("status", "in_progress")
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("이미 처리된 온보딩입니다.");
    } else {
      throw new Error("지원하지 않는 작업입니다.");
    }

    await writeAdminAuditLog({
      session,
      request,
      action: `onboarding.${action}`,
      targetType: "onboarding_request",
      targetId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) {
      return NextResponse.json({ error: "Unauthorized" }, { status });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "온보딩을 처리하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
