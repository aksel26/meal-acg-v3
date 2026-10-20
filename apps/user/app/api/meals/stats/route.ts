import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// 사용가능액·차감·주말/공휴일 근무 가산은 DB 뷰 user_monthly_stats가 계산한다.
// 관리자 앱과 같은 RPC(get_user_monthly_stats)를 읽어 화면마다 숫자가 어긋나지 않게 한다.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const userId = searchParams.get("user_id");

    if (!month || !year || !userId) {
      return NextResponse.json(
        { success: false, error: "month, year, user_id 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase.rpc("get_user_monthly_stats", {
      p_year: parseInt(year),
      p_month: parseInt(month),
      p_user_id: userId,
    });

    if (error) {
      console.error("Meal stats RPC error:", error);
      return NextResponse.json(
        { success: false, error: "식대 데이터 조회 오류" },
        { status: 500 }
      );
    }

    const stats = data?.[0];
    if (!stats) {
      return NextResponse.json(
        { success: false, error: "사용자 통계를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        allowanceAmount: stats.total_allowance, // 실제 사용가능 금액 (차감·가산 반영)
        originalAllowance: stats.original_allowance, // 원래 월별 지원금
        totalUsed: stats.total_used,
        balance: stats.balance,
        individualMealCount: stats.individual_meals,
        individualMealDeduction: stats.individual_meal_deduction,
        noMealFullDayCount: stats.annual_leave_days + stats.day_off_days + stats.remote_work_days, // 연차/재택/휴무 일수
        noMealDeduction: stats.no_meal_deduction,
        halfDayOffCount: stats.half_day_off_count,
        halfDayDeduction: stats.half_day_deduction,
        totalDeduction: stats.total_deduction,
        dailyAllowance: stats.daily_allowance,
        weekendWorkCount: stats.weekend_work_days, // 주말·공휴일 근무 일수
        weekendWorkAddition: stats.weekend_work_days * stats.daily_allowance,
      },
    });
  } catch (error) {
    console.error("Meal stats error:", error);
    return NextResponse.json(
      { success: false, error: "통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
