import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { createServiceClient } from "@/lib/supabase/server";
import {
  assertOperationDateRange,
  operationDate,
  operationPage,
  operationPageData,
  operationText,
} from "utils/company-operations";

const client = () => createServiceClient() as any;

function seatPayload(body: Record<string, unknown>) {
  const status = operationText(body.status, "상태") || "available";
  if (!["available", "disabled"].includes(status)) {
    throw new Error("좌석 상태를 확인해주세요.");
  }
  return {
    code: operationText(body.code, "좌석 코드", {
      required: true,
      max: 40,
    }),
    name: operationText(body.name, "좌석명", {
      required: true,
      max: 100,
    }),
    zone: operationText(body.zone, "구역", { required: true, max: 100 }),
    floor: operationText(body.floor, "층", { max: 50 }) || null,
    row_label: operationText(body.rowLabel, "행", { max: 50 }) || null,
    column_label: operationText(body.columnLabel, "열", { max: 50 }) || null,
    status,
    note: operationText(body.note, "메모", { max: 2000 }) || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("seating:read");
    const supabase = client();
    const pagination = operationPage(request.nextUrl.searchParams);
    const [seats, requests, assignments, members] = await Promise.all([
      supabase.from("office_seats").select("*").order("zone").order("code"),
      supabase
        .from("seat_requests")
        .select(
          `
            *,
            member:members!seat_requests_member_id_fkey(id, full_name),
            requested_seat:office_seats!seat_requests_requested_seat_id_fkey(id, code, name),
            assigned_seat:office_seats!seat_requests_assigned_seat_id_fkey(id, code, name)
          `,
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(pagination.from, pagination.to),
      supabase
        .from("seat_assignments")
        .select(
          `
            *,
            member:members!seat_assignments_member_id_fkey(id, full_name),
            seat:office_seats!seat_assignments_seat_id_fkey(id, code, name, zone)
          `,
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(pagination.from, pagination.to),
      supabase.from("members").select("id, full_name").order("full_name"),
    ]);
    for (const result of [seats, requests, assignments, members]) {
      if (result.error) throw result.error;
    }
    const requestPage = operationPageData(requests.data, pagination);
    const assignmentPage = operationPageData(assignments.data, pagination);
    return NextResponse.json({
      seats: seats.data ?? [],
      requests: requestPage.items,
      assignments: assignmentPage.items,
      members: members.data ?? [],
      pagination: {
        ...requestPage.pagination,
        hasMore:
          requestPage.pagination.hasMore || assignmentPage.pagination.hasMore,
      },
    });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      { error: "좌석 관리 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("seating:write");
    const body = (await request.json()) as Record<string, unknown>;
    const { data, error } = await client()
      .from("office_seats")
      .insert(seatPayload(body))
      .select()
      .single();
    if (error) throw error;
    await writeAdminAuditLog({
      session,
      request,
      action: "seating.seat.create",
      targetType: "office_seat",
      targetId: data.id,
      targetLabel: data.code,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "좌석을 추가하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminPermission("seating:write");
    const body = (await request.json()) as Record<string, unknown>;
    const action = operationText(body.action, "작업", { required: true });
    const id = operationText(body.id, "대상", { required: true });
    const supabase = client();

    if (action === "update_seat") {
      const { data, error } = await supabase
        .from("office_seats")
        .update(seatPayload(body))
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("좌석을 찾을 수 없습니다.");
    } else if (action === "approve_request" || action === "reject_request") {
      const startDate = operationDate(body.startDate, "시작일", false);
      const endDate = operationDate(body.endDate, "종료일", false);
      if (startDate) assertOperationDateRange(startDate, endDate);
      const { error } = await supabase.rpc("resolve_seat_request", {
        p_request_id: id,
        p_actor_id: session.userId,
        p_action: action === "approve_request" ? "approve" : "reject",
        p_seat_id:
          action === "approve_request"
            ? operationText(body.seatId, "배정 좌석", { required: true })
            : null,
        p_rejection_reason:
          action === "reject_request"
            ? operationText(body.reason, "반려 사유", {
                required: true,
                max: 2000,
              })
            : null,
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) throw error;
    } else if (action === "move_assignment") {
      const startDate = operationDate(body.startDate, "이동일");
      const endDate = operationDate(body.endDate, "종료일", false);
      assertOperationDateRange(startDate, endDate);
      const { error } = await supabase.rpc("move_seat_assignment", {
        p_assignment_id: id,
        p_new_seat_id: operationText(body.seatId, "이동 좌석", {
          required: true,
        }),
        p_actor_id: session.userId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_note: operationText(body.note, "메모", { max: 2000 }) || null,
      });
      if (error) throw error;
    } else if (action === "end_assignment" || action === "cancel_assignment") {
      const { data: assignment } = await supabase
        .from("seat_assignments")
        .select("start_date, status")
        .eq("id", id)
        .maybeSingle();
      if (!assignment || assignment.status !== "active") {
        throw new Error("활성 배정을 찾을 수 없습니다.");
      }
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("seat_assignments")
        .update({
          status: action === "end_assignment" ? "ended" : "cancelled",
          end_date:
            today < assignment.start_date ? assignment.start_date : today,
          ended_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "active")
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("이미 종료된 배정입니다.");
    } else {
      throw new Error("지원하지 않는 작업입니다.");
    }

    await writeAdminAuditLog({
      session,
      request,
      action: `seating.${action}`,
      targetType: action.includes("assignment")
        ? "seat_assignment"
        : action.includes("request")
          ? "seat_request"
          : "office_seat",
      targetId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "좌석 작업을 처리하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdminPermission("seating:write");
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) throw new Error("좌석을 확인해주세요.");
    const supabase = client();
    const [{ count: assignmentCount }, { count: requestCount }] =
      await Promise.all([
        supabase
          .from("seat_assignments")
          .select("id", { count: "exact", head: true })
          .eq("seat_id", id),
        supabase
          .from("seat_requests")
          .select("id", { count: "exact", head: true })
          .or(`requested_seat_id.eq.${id},assigned_seat_id.eq.${id}`),
      ]);
    if ((assignmentCount ?? 0) > 0 || (requestCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "이력이 있는 좌석은 삭제할 수 없습니다. 사용중지로 변경해주세요.",
        },
        { status: 409 },
      );
    }
    const { error } = await supabase.from("office_seats").delete().eq("id", id);
    if (error) throw error;
    await writeAdminAuditLog({
      session,
      request,
      action: "seating.seat.delete",
      targetType: "office_seat",
      targetId: id,
      riskLevel: "high",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "좌석을 삭제하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
