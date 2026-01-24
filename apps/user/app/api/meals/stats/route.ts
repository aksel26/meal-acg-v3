import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import dayjs from "dayjs";

interface MonthlyAllowanceData {
  allowance: number;
  workdays: number;
}

interface MonthlyAllowancesJson {
  [year: string]: {
    [month: string]: MonthlyAllowanceData;
  };
}

const INDIVIDUAL_MEAL_ATTENDANCE = "근무(개별식사 / 식사안함)";

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

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // global_settings에서 월별 지원금 및 일일 지원금 조회
    const { data: settingsData } = await supabase
      .from("global_settings")
      .select("monthly_allowances, daily_allowance")
      .eq("id", 1)
      .single();

    const monthlyAllowances = (settingsData?.monthly_allowances as unknown as MonthlyAllowancesJson) || {};
    const yearData = monthlyAllowances[String(yearNum)] || {};
    const monthData = yearData[String(monthNum)];
    const allowanceAmount = monthData?.allowance ?? 0;
    const dailyAllowance = settingsData?.daily_allowance ?? 10000;

    // 해당 월 식대 총 사용액 계산
    const startDate = dayjs(`${yearNum}-${monthNum}-01`).format("YYYY-MM-DD");
    const endDate = dayjs(`${yearNum}-${monthNum}-01`)
      .endOf("month")
      .format("YYYY-MM-DD");

    const { data: mealLogs, error: mealError } = await supabase
      .from("meal_logs")
      .select("total_amount, attendance")
      .eq("user_id", userId)
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);

    if (mealError) {
      console.error("Meal logs query error:", mealError);
      return NextResponse.json(
        { success: false, error: "식대 데이터 조회 오류" },
        { status: 500 }
      );
    }

    const totalUsed = mealLogs?.reduce(
      (sum, log) => sum + (log.total_amount || 0),
      0
    ) ?? 0;

    const mealCount = mealLogs?.length ?? 0;

    // 개별식사 수 계산
    const individualMealCount = mealLogs?.filter(
      (log) => log.attendance === INDIVIDUAL_MEAL_ATTENDANCE
    ).length ?? 0;

    // 개별식사 차감액 계산 (개별식사 수 × 일일 지원금)
    const individualMealDeduction = individualMealCount * dailyAllowance;

    // 실제 사용가능 금액 = 월별 지원금 - 개별식사 차감액
    const effectiveAllowance = allowanceAmount - individualMealDeduction;

    // 잔액 = 실제 사용가능 금액 - 총 사용액
    const balance = effectiveAllowance - totalUsed;

    return NextResponse.json({
      success: true,
      data: {
        allowanceAmount: effectiveAllowance, // 실제 사용가능 금액 반환
        originalAllowance: allowanceAmount, // 원래 월별 지원금
        totalUsed,
        balance,
        mealCount,
        individualMealCount,
        individualMealDeduction,
        dailyAllowance,
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
