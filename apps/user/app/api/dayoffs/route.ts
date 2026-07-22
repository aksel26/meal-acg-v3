import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// GET /api/dayoffs - 근태 목록 조회 (월별, 본인 것만)
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    // 대시보드 팀 휴가 캘린더는 무param 시 전사 휴가를 조회한다.
    // 무인증 유출만 차단하고(위 401), 조회 범위는 기존 동작을 유지한다.
    const targetId = searchParams.get("target_id");

    let query = supabase
      .from("dayoffs")
      .select(
        `
        *,
        author:members!dayoffs_author_id_fkey(id, full_name),
        target:members!dayoffs_target_id_fkey(id, full_name),
        approver:members!dayoffs_approver_id_fkey(id, full_name),
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// POST /api/dayoffs - 근태 등록 (영업일만 INSERT)
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const {
      startDate,
      endDate,
      leaveTypeId,
      lateHour,
      lateMinute,
      ccMemberIds,
      reason,
    } = body;

    // 작성자·대상 모두 세션 본인으로 강제 (본인 휴가만 신청, 대리 신청 불가)
    const authorId = sessionUser.id;
    const targetId = sessionUser.id;

    if (!startDate || !leaveTypeId) {
      return NextResponse.json(
        { error: "startDate, leaveTypeId are required" },
        { status: 400 },
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) ||
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

    // 영업일 3일 규칙 검증 (지각 제외)
    if (leaveTypeId !== 1) {
      const { data: holidays } = await supabase
        .from("holidays")
        .select("holiday_date")
        .gte("holiday_date", new Date().toISOString().split("T")[0]!)
        .lte(
          "holiday_date",
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]!,
        );

      const holidaySet = new Set((holidays || []).map((h) => h.holiday_date));

      // 오늘부터 3영업일 계산
      let businessDays = 0;
      const check = new Date();
      while (businessDays < 3) {
        check.setDate(check.getDate() + 1);
        const dow = check.getDay();
        const ds = check.toISOString().split("T")[0]!;
        if (dow !== 0 && dow !== 6 && !holidaySet.has(ds)) {
          businessDays++;
        }
      }
      const minDate = check.toISOString().split("T")[0]!;

      if (startDate < minDate) {
        return NextResponse.json(
          {
            error: `영업일 기준 3일 이후부터 등록 가능합니다. (최소: ${minDate})`,
            minDate,
          },
          { status: 400 },
        );
      }
    }

    // 공휴일 조회
    const end = endDate || startDate;
    const { data: holidays } = await supabase
      .from("holidays")
      .select("holiday_date")
      .gte("holiday_date", startDate)
      .lte("holiday_date", end);

    const holidaySet = new Set((holidays || []).map((h) => h.holiday_date));

    // 영업일만 추출
    const dates: string[] = [];
    const current = new Date(startDate + "T00:00:00");
    const last = new Date(end + "T00:00:00");

    while (current <= last) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split("T")[0]!;
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

    const { data: approverId, error: approverError } = await supabase.rpc(
      "get_approver_for_member",
      { p_member_id: targetId },
    );

    if (approverError || !approverId) {
      return NextResponse.json(
        { error: "승인자를 찾을 수 없습니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("create_leave_request_atomic", {
      p_request_id: crypto.randomUUID(),
      p_author_id: authorId,
      p_target_id: targetId,
      p_approver_id: approverId,
      p_dates: dates,
      p_leave_type_id: leaveTypeId,
      p_late_hour: lateHour || null,
      p_late_minute: lateMinute || null,
      p_cc_member_ids: ccMemberIds || [],
      p_reason: reason || null,
      p_initial_status: "pending",
    });

    if (error) {
      console.error("Atomic dayoff creation failed:", error);
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
      (data || []).map((row) => ({
        id: row.dayoff_id,
        leave_date: row.leave_date,
        approval_status: row.approval_status,
      })),
      { status: 201 },
    );
  } catch (error) {
    console.error("Dayoffs API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
