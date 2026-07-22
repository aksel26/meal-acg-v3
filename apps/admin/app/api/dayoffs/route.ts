import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/dayoffs - 근태 목록 조회 (월별, 대상자별 필터)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const targetId = searchParams.get("target_id");

    let query = supabase
      .from("dayoffs")
      .select(
        `
        *,
        author:members!dayoffs_author_id_fkey(id, full_name),
        target:members!dayoffs_target_id_fkey(id, full_name),
        approver:members!dayoffs_approver_id_fkey(id, full_name),
        last_editor:members!dayoffs_last_editor_id_fkey(id, full_name),
        leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category, duration_type)
      `,
      )
      .eq("is_deleted", false)
      .order("leave_date", { ascending: true });

    if (year && month) {
      const m = month.padStart(2, "0");
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      query = query
        .gte("leave_date", `${year}-${m}-01`)
        .lte("leave_date", `${year}-${m}-${lastDay}`);
    } else if (year) {
      query = query
        .gte("leave_date", `${year}-01-01`)
        .lte("leave_date", `${year}-12-31`);
    }

    if (targetId) {
      query = query.eq("target_id", targetId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching dayoffs:", error);
      return NextResponse.json(
        { error: "Failed to fetch dayoffs" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/dayoffs - 근태 등록 (날짜 범위 → 영업일만 개별 INSERT)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      targetId,
      startDate,
      endDate,
      leaveTypeId,
      lateHour,
      lateMinute,
      approverId,
      ccMemberIds,
      reason,
    } = body;

    if (!targetId || !startDate || !leaveTypeId) {
      return NextResponse.json(
        { error: "targetId, startDate, and leaveTypeId are required" },
        { status: 400 },
      );
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (
      !datePattern.test(startDate) ||
      (endDate && !datePattern.test(endDate)) ||
      (endDate && endDate < startDate)
    ) {
      return NextResponse.json(
        { error: "유효한 날짜 범위를 입력해주세요." },
        { status: 400 },
      );
    }

    const { data: leaveType, error: leaveTypeError } = await supabase
      .from("leave_types")
      .select("id")
      .eq("id", leaveTypeId)
      .single();

    if (leaveTypeError || !leaveType) {
      return NextResponse.json(
        { error: "유효한 근태 유형을 선택해주세요." },
        { status: 400 },
      );
    }

    // 영업일 필터링을 위해 공휴일 조회
    const end = endDate || startDate;
    const { data: holidays } = await supabase
      .from("holidays")
      .select("holiday_date")
      .gte("holiday_date", startDate)
      .lte("holiday_date", end);

    const holidaySet = new Set((holidays || []).map((h) => h.holiday_date));

    // 시작일~종료일 범위에서 영업일만 추출
    const dates: string[] = [];
    const current = new Date(startDate + "T00:00:00");
    const last = new Date(end + "T00:00:00");

    while (current <= last) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split("T")[0]!;

      // 주말(토=6, 일=0) 및 공휴일 제외
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
        dates.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }

    if (dates.length === 0) {
      return NextResponse.json(
        { error: "선택한 기간에 영업일이 없습니다." },
        { status: 400 },
      );
    }

    const { data: automaticApproverId, error: approverError } = approverId
      ? { data: approverId, error: null }
      : await supabase.rpc("get_approver_for_member", {
          p_member_id: targetId,
        });

    if (approverError || !automaticApproverId) {
      return NextResponse.json(
        { error: "승인자를 찾을 수 없습니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("create_leave_request_atomic", {
      p_request_id: crypto.randomUUID(),
      p_author_id: session.userId,
      p_target_id: targetId,
      p_approver_id: automaticApproverId,
      p_dates: dates,
      p_leave_type_id: leaveTypeId,
      p_late_hour: lateHour || null,
      p_late_minute: lateMinute || null,
      p_cc_member_ids: ccMemberIds || [],
      p_reason: reason || null,
      p_initial_status: approverId ? "approved" : "pending",
    });

    if (error) {
      console.error("Atomic admin dayoff creation failed:", error);
      return NextResponse.json(
        {
          error: error.message.includes("DUPLICATE_DATE")
            ? "해당 날짜에 이미 신청했거나 승인된 휴가가 있습니다."
            : "Failed to create dayoffs",
        },
        { status: error.message.includes("DUPLICATE_DATE") ? 409 : 500 },
      );
    }

    return NextResponse.json(
      (data || []).map(
        (row: {
          dayoff_id: string;
          leave_date: string;
          approval_status: string;
        }) => ({
          id: row.dayoff_id,
          leave_date: row.leave_date,
          approval_status: row.approval_status,
        }),
      ),
      { status: 201 },
    );
  } catch (error) {
    console.error("Dayoffs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
