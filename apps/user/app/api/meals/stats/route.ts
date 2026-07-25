import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import { getMonthDateRange } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const year = Number(request.nextUrl.searchParams.get("year"));
    const month = Number(request.nextUrl.searchParams.get("month"));
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { success: false, error: "올바른 year, month가 필요합니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const { startDate, endDate } = getMonthDateRange(year, month);
    const [statsResult, countResult] = await Promise.all([
      supabase.rpc("get_user_monthly_stats", {
        p_year: year,
        p_month: month,
        p_user_id: sessionUser.id,
      }),
      supabase
        .from("meal_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", sessionUser.id)
        .gte("entry_date", startDate)
        .lte("entry_date", endDate),
    ]);

    if (statsResult.error) {
      console.error("Meal stats query error:", statsResult.error);
      return NextResponse.json(
        { success: false, error: "식대 데이터 조회 오류" },
        { status: 500 },
      );
    }
    if (countResult.error) {
      console.error("Meal count query error:", countResult.error);
    }

    const stats = statsResult.data?.[0];
    if (!stats) {
      return NextResponse.json(
        { success: false, error: "해당 월의 식대 설정을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        allowanceAmount: stats.total_allowance,
        originalAllowance: stats.original_allowance,
        totalUsed: stats.total_used,
        balance: stats.balance,
        mealCount: countResult.count ?? 0,
        individualMealCount: stats.individual_meals,
        individualMealDeduction: stats.individual_meal_deduction,
        noMealFullDayCount:
          stats.annual_leave_days + stats.day_off_days + stats.remote_work_days,
        noMealDeduction: stats.no_meal_deduction,
        halfDayOffCount: stats.half_day_off_count,
        halfDayDeduction: stats.half_day_deduction,
        totalDeduction: stats.total_deduction,
        dailyAllowance: stats.daily_allowance,
        weekendWorkCount: stats.weekend_work_days,
        weekendWorkAddition: stats.weekend_work_days * stats.daily_allowance,
      },
    });
  } catch (error) {
    console.error("Meal stats error:", error);
    return NextResponse.json(
      { success: false, error: "통계 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
