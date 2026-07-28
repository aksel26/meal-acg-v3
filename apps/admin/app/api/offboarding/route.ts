import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { createServiceClient } from "@/lib/supabase/server";
import {
  OperationInputError,
  operationDate,
  operationPage,
  operationPageData,
  operationSearch,
  operationText,
} from "utils/company-operations";

const client = () => createServiceClient() as any;

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("offboarding:read");
    const supabase = client();
    const params = request.nextUrl.searchParams;
    const pagination = operationPage(params);
    const status = operationText(params.get("status"), "상태", { max: 30 });
    const member = operationSearch(params, "member");
    const date = operationDate(params.get("date"), "최종 근무일", false);
    let requestsQuery = supabase
      .from("offboarding_requests")
      .select(
        `
          *,
          member:members!offboarding_requests_member_id_fkey!inner(
            id, full_name, role,
            team:teams!members_team_id_fkey(id, name)
          ),
          checklist:offboarding_checklist_items(*)
        `,
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (status) requestsQuery = requestsQuery.eq("status", status);
    if (member) {
      requestsQuery = requestsQuery.ilike("member.full_name", `%${member}%`);
    }
    if (date) {
      requestsQuery = requestsQuery.or(
        `requested_final_working_date.eq.${date},confirmed_final_working_date.eq.${date}`,
      );
    }
    const [requestsResult, membersResult] = await Promise.all([
      requestsQuery.range(pagination.from, pagination.to),
      supabase.from("members").select("id, full_name, role").order("full_name"),
    ]);
    if (requestsResult.error) throw requestsResult.error;
    if (membersResult.error) throw membersResult.error;
    const requestPage = operationPageData(requestsResult.data, pagination);
    return NextResponse.json({
      requests: requestPage.items,
      members: membersResult.data ?? [],
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
    console.error("GET /api/offboarding error:", error);
    return NextResponse.json(
      { error: "오프보딩 요청을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("offboarding:write");
    const body = (await request.json()) as Record<string, unknown>;
    const { data, error } = await client()
      .from("offboarding_requests")
      .insert({
        member_id: operationText(body.memberId, "직원", { required: true }),
        requested_final_working_date: operationDate(
          body.requestedFinalWorkingDate,
          "희망 최종 근무일",
        ),
        reason: operationText(body.reason, "사유", {
          required: true,
          max: 1000,
        }),
        note: operationText(body.note, "메모", { max: 2000 }) || null,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "해당 직원에게 이미 진행 중인 요청이 있습니다." },
          { status: 409 },
        );
      }
      throw error;
    }
    await writeAdminAuditLog({
      session,
      request,
      action: "offboarding.create",
      targetType: "offboarding_request",
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
            : "요청을 등록하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminPermission("offboarding:write");
    const body = (await request.json()) as Record<string, unknown>;
    const action = operationText(body.action, "작업", { required: true });
    const supabase = client();
    let targetId = operationText(body.id, "요청", { required: true });

    if (action === "add_checklist") {
      const { data, error } = await supabase
        .from("offboarding_checklist_items")
        .insert({
          offboarding_request_id: targetId,
          title: operationText(body.title, "체크 항목", {
            required: true,
            max: 200,
          }),
          responsible_party:
            operationText(body.responsibleParty, "담당", { max: 200 }) || null,
          sort_order: Number.isInteger(Number(body.sortOrder))
            ? Math.max(0, Number(body.sortOrder))
            : 0,
        })
        .select()
        .single();
      if (error) throw error;
      targetId = data.id;
    } else if (action === "update_checklist") {
      const itemId = operationText(body.itemId, "체크 항목", {
        required: true,
      });
      const completed = Boolean(body.isCompleted);
      const { data, error } = await supabase
        .from("offboarding_checklist_items")
        .update({
          title: operationText(body.title, "체크 항목", {
            required: true,
            max: 200,
          }),
          responsible_party:
            operationText(body.responsibleParty, "담당", { max: 200 }) || null,
          is_completed: completed,
          completion_note:
            operationText(body.completionNote, "완료 메모", { max: 2000 }) ||
            null,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", itemId)
        .eq("offboarding_request_id", targetId)
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
        .from("offboarding_checklist_items")
        .delete()
        .eq("id", itemId)
        .eq("offboarding_request_id", targetId);
      if (error) throw error;
      targetId = itemId;
    } else if (action === "update") {
      const { data, error } = await supabase
        .from("offboarding_requests")
        .update({
          requested_final_working_date: operationDate(
            body.requestedFinalWorkingDate,
            "희망 최종 근무일",
          ),
          confirmed_final_working_date: operationDate(
            body.confirmedFinalWorkingDate,
            "확정 최종 근무일",
            false,
          ),
          reason: operationText(body.reason, "사유", {
            required: true,
            max: 1000,
          }),
          note: operationText(body.note, "메모", { max: 2000 }) || null,
          admin_note:
            operationText(body.adminNote, "관리자 메모", { max: 2000 }) || null,
        })
        .eq("id", targetId)
        .in("status", ["pending", "approved"])
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("수정 가능한 요청을 찾을 수 없습니다.");
    } else {
      const { data: current } = await supabase
        .from("offboarding_requests")
        .select("status, requested_final_working_date")
        .eq("id", targetId)
        .maybeSingle();
      if (!current) throw new Error("요청을 찾을 수 없습니다.");

      let changes: Record<string, unknown>;
      if (action === "approve") {
        changes = {
          status: "approved",
          confirmed_final_working_date:
            operationDate(
              body.confirmedFinalWorkingDate,
              "확정 최종 근무일",
              false,
            ) || current.requested_final_working_date,
          processed_by: session.userId,
          processed_at: new Date().toISOString(),
          rejection_reason: null,
        };
      } else if (action === "reject") {
        changes = {
          status: "rejected",
          rejection_reason: operationText(body.reason, "반려 사유", {
            required: true,
            max: 2000,
          }),
          processed_by: session.userId,
          processed_at: new Date().toISOString(),
        };
      } else if (action === "complete") {
        const { error } = await supabase.rpc("complete_offboarding_request", {
          p_request_id: targetId,
        });
        if (error?.message?.includes("OFFBOARDING_CHECKLIST_INCOMPLETE")) {
          throw new Error("완료되지 않은 체크 항목이 있습니다.");
        }
        if (error?.message?.includes("OFFBOARDING_REQUEST_NOT_APPROVED")) {
          throw new Error("진행 중인 요청만 완료할 수 있습니다.");
        }
        if (error) throw error;
        changes = {};
      } else if (action === "cancel") {
        changes = {
          status: "cancelled",
          admin_note:
            operationText(body.reason, "취소 메모", { max: 2000 }) || null,
          processed_by: session.userId,
          processed_at: new Date().toISOString(),
        };
      } else {
        throw new Error("지원하지 않는 작업입니다.");
      }

      if (action !== "complete") {
        const { data, error } = await supabase
          .from("offboarding_requests")
          .update(changes)
          .eq("id", targetId)
          .eq("status", current.status)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("이미 처리된 요청입니다.");
      }
    }

    await writeAdminAuditLog({
      session,
      request,
      action: `offboarding.${action}`,
      targetType: "offboarding_request",
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
            : "요청을 처리하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
