import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

interface MealLog {
  user_id: string;
  entry_date: string;
  attendance: string | null;
  breakfast_store: string | null;
  breakfast_amount: number | null;
  lunch_store: string | null;
  lunch_amount: number | null;
  dinner_store: string | null;
  dinner_amount: number | null;
}

interface MissingDate {
  date: string;
  hasAttendance: boolean;
  hasBreakfast: boolean;
  hasLunch: boolean;
  hasDinner: boolean;
}

// GET /api/stats/incomplete-users - 단일 사용자 또는 기본 정보 조회
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const userId = searchParams.get("userId");

    // 1. Get holidays for the month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    const { data: holidays, error: holidaysError } = await supabase
      .from("holidays")
      .select("holiday_date")
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate);

    if (holidaysError) {
      console.error("Error fetching holidays:", holidaysError);
      return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
    }

    const holidayDates = new Set((holidays || []).map((h: { holiday_date: string }) => h.holiday_date));

    // 2. Calculate weekdays (excluding weekends and holidays)
    const weekdays: string[] = [];
    const today = new Date();
    const currentDate = new Date(year, month - 1, 1);

    while (currentDate.getMonth() === month - 1) {
      const dayOfWeek = currentDate.getDay();
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, "0");
      const d = String(currentDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      // Skip future dates
      if (currentDate > today) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
        weekdays.push(dateStr);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // userId가 없으면 멤버 목록과 기본 정보만 반환
    if (!userId) {
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");

      if (membersError) {
        console.error("Error fetching members:", membersError);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
      }

      return NextResponse.json({
        year,
        month,
        total_weekdays: weekdays.length,
        members: members || [],
      });
    }

    // 3. 특정 사용자의 meal logs 조회
    const { data: mealLogs, error: mealLogsError } = await supabase
      .from("meal_logs")
      .select("user_id, entry_date, attendance, breakfast_store, breakfast_amount, lunch_store, lunch_amount, dinner_store, dinner_amount")
      .eq("user_id", userId)
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);

    if (mealLogsError) {
      console.error("Error fetching meal logs:", mealLogsError);
      return NextResponse.json({ error: "Failed to fetch meal logs" }, { status: 500 });
    }

    // 4. Create a map of date -> meal_log
    const userLogs = new Map<string, MealLog>();
    (mealLogs || []).forEach((log: MealLog) => {
      userLogs.set(log.entry_date, log);
    });

    // 5. Check for missing entries
    const missingDates: MissingDate[] = [];

    for (const weekday of weekdays) {
      const log = userLogs.get(weekday);

      const hasAttendance = Boolean(log?.attendance);
      const attendance = log?.attendance || "";

      // 누락 체크 제외 조건: 개별식사, 연차, 휴무, 휴가, 반차
      const isIndividualMeal = attendance.includes("개별");
      const isLeave = attendance.includes("연차") || attendance.includes("휴무") || attendance.includes("휴가");
      const isHalfDay = attendance.includes("반차");

      const hasBreakfast = Boolean(log?.breakfast_store || (log?.breakfast_amount && log.breakfast_amount > 0));
      const hasLunch = Boolean(log?.lunch_store || (log?.lunch_amount && log.lunch_amount > 0));
      const hasDinner = Boolean(log?.dinner_store || (log?.dinner_amount && log.dinner_amount > 0));

      // 개별식사, 연차/휴무/휴가, 반차인 경우 누락 조건에서 제외
      if (isIndividualMeal || isLeave || isHalfDay) {
        continue;
      }

      const hasMealEntry = hasBreakfast || hasLunch || hasDinner;

      if (!hasAttendance || !hasMealEntry) {
        missingDates.push({
          date: weekday,
          hasAttendance,
          hasBreakfast,
          hasLunch,
          hasDinner,
        });
      }
    }

    return NextResponse.json({
      user_id: userId,
      work_days: weekdays.length,
      input_days: weekdays.length - missingDates.length,
      missing_dates: missingDates,
      is_complete: missingDates.length === 0,
    });
  } catch (error) {
    console.error("Incomplete users API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
