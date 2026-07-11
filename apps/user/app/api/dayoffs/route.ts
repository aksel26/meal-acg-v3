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
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    // 조회 대상은 세션에서 강제 (본인 근태만)
    const targetId = sessionUser.id;

    let query = supabase
      .from("dayoffs")
      .select(
        `
        *,
        author:members!dayoffs_author_id_fkey(id, full_name),
        target:members!dayoffs_target_id_fkey(id, full_name),
        approver:members!dayoffs_approver_id_fkey(id, full_name),
        leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category, duration_type)
      `
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
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
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
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

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

    // 작성자는 세션에서 강제 (body 값 신뢰하지 않음)
    const authorId = sessionUser.id;

    if (!targetId || !startDate || !leaveTypeId) {
      return NextResponse.json(
        { error: "targetId, startDate, leaveTypeId are required" },
        { status: 400 }
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
            .split("T")[0]!
        );

      const holidaySet = new Set(
        (holidays || []).map((h) => h.holiday_date)
      );

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
          { status: 400 }
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

    const holidaySet = new Set(
      (holidays || []).map((h) => h.holiday_date)
    );

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
        { status: 400 }
      );
    }

    const rows = dates.map((date) => ({
      author_id: authorId,
      target_id: targetId,
      leave_date: date,
      leave_type_id: leaveTypeId,
      late_hour: leaveTypeId === 1 ? lateHour || null : null,
      late_minute: leaveTypeId === 1 ? lateMinute || null : null,
      approver_id: approverId || null,
      approved_at: approverId ? new Date().toISOString() : null,
      cc_member_ids: ccMemberIds || [],
      reason: reason || null,
    }));

    const { data, error } = await supabase
      .from("dayoffs")
      .insert(rows)
      .select();

    if (error) {
      console.error("Error creating dayoffs:", error);
      return NextResponse.json(
        { error: "Failed to create dayoffs" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Dayoffs API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
