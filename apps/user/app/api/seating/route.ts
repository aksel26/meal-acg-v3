import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import {
  assertOperationDateRange,
  operationDate,
  operationPage,
  operationPageData,
  operationText,
} from "utils/company-operations";

async function context() {
  const session = await getSessionUser();
  if (!session) return null;
  const supabase = createServiceClient();
  if (!supabase) throw new Error("데이터베이스 연결 오류");
  return { session, supabase: supabase as any };
}

async function requireAvailableSeat(
  ctx: NonNullable<Awaited<ReturnType<typeof context>>>,
  seatId: string,
) {
  const { data, error } = await ctx.supabase
    .from("office_seats")
    .select("id")
    .eq("id", seatId)
    .eq("status", "available")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("신청 가능한 좌석이 아닙니다.");
}

export async function GET(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const pagination = operationPage(new URL(request.url).searchParams);
    const [seatsResult, assignmentsResult, requestsResult] = await Promise.all([
      ctx.supabase.from("office_seats").select("*").order("zone").order("code"),
      ctx.supabase
        .from("seat_assignments")
        .select("id, seat_id, member_id, start_date, end_date, status")
        .eq("status", "active")
        .lte("start_date", today)
        .or(`end_date.is.null,end_date.gte.${today}`),
      ctx.supabase
        .from("seat_requests")
        .select(
          `
            *,
            requested_seat:office_seats!seat_requests_requested_seat_id_fkey(
              id, code, name, zone
            ),
            assigned_seat:office_seats!seat_requests_assigned_seat_id_fkey(
              id, code, name, zone
            )
          `,
        )
        .eq("member_id", ctx.session.id)
        .order("created_at", { ascending: false })
        .range(pagination.from, pagination.to),
    ]);
    if (seatsResult.error) throw seatsResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;
    if (requestsResult.error) throw requestsResult.error;

    const activeAssignments = assignmentsResult.data ?? [];
    const assignmentsBySeat = new Map<string, any[]>();
    for (const assignment of activeAssignments) {
      const assignments = assignmentsBySeat.get(assignment.seat_id) ?? [];
      assignments.push(assignment);
      assignmentsBySeat.set(assignment.seat_id, assignments);
    }
    const seats = (seatsResult.data ?? []).map((seat: any) => {
      const assignments = assignmentsBySeat.get(seat.id) ?? [];
      return {
        ...seat,
        is_available: seat.status === "available" && assignments.length === 0,
        is_mine: assignments.some(
          (assignment: any) => assignment.member_id === ctx.session.id,
        ),
      };
    });
    const requestPage = operationPageData(requestsResult.data, pagination);

    return NextResponse.json({
      seats,
      assignments: activeAssignments.filter(
        (assignment: any) => assignment.member_id === ctx.session.id,
      ),
      requests: requestPage.items,
      pagination: requestPage.pagination,
    });
  } catch (error) {
    console.error("GET /api/seating error:", error);
    return NextResponse.json(
      { error: "좌석 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const requestedSeatId = operationText(body.requestedSeatId, "희망 좌석", {
      required: true,
    });
    const startDate = operationDate(body.requestedStartDate, "시작일");
    const endDate = operationDate(body.requestedEndDate, "종료일", false);
    assertOperationDateRange(startDate, endDate);

    await requireAvailableSeat(ctx, requestedSeatId);

    const { data, error } = await ctx.supabase
      .from("seat_requests")
      .insert({
        member_id: ctx.session.id,
        requested_seat_id: requestedSeatId,
        requested_start_date: startDate,
        requested_end_date: endDate,
        note: operationText(body.note, "메모", { max: 2000 }) || null,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 처리 대기 중인 좌석 요청이 있습니다." },
          { status: 409 },
        );
      }
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "좌석을 신청하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const id = operationText(body.id, "요청", { required: true });
    const action = operationText(body.action, "작업", { required: true });
    let changes: Record<string, unknown>;
    if (action === "cancel") {
      changes = { status: "cancelled", processed_at: new Date().toISOString() };
    } else if (action === "update") {
      const startDate = operationDate(body.requestedStartDate, "시작일");
      const endDate = operationDate(body.requestedEndDate, "종료일", false);
      assertOperationDateRange(startDate, endDate);
      const requestedSeatId = operationText(body.requestedSeatId, "희망 좌석", {
        required: true,
      });
      await requireAvailableSeat(ctx, requestedSeatId);
      changes = {
        requested_seat_id: requestedSeatId,
        requested_start_date: startDate,
        requested_end_date: endDate,
        note: operationText(body.note, "메모", { max: 2000 }) || null,
      };
    } else {
      throw new Error("지원하지 않는 작업입니다.");
    }

    const { data, error } = await ctx.supabase
      .from("seat_requests")
      .update(changes)
      .eq("id", id)
      .eq("member_id", ctx.session.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "수정 가능한 대기 요청을 찾을 수 없습니다." },
        { status: 409 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "좌석 요청을 변경하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
