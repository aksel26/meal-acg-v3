import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/stats/trends - 월별 추이 데이터 (최근 6개월)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    const trends = [];

    // 최근 6개월 데이터 수집
    for (let i = 5; i >= 0; i--) {
      let targetMonth = month - i;
      let targetYear = year;

      if (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }

      const startDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
      const endDate = new Date(targetYear, targetMonth, 0).toISOString().split("T")[0];

      // 해당 월의 meal_logs 합계
      const { data: logs, error } = await supabase
        .from("meal_logs")
        .select("lunch_amount, dinner_amount, breakfast_amount")
        .gte("entry_date", startDate)
        .lte("entry_date", endDate);

      if (error) {
        console.error(`Error fetching logs for ${targetYear}-${targetMonth}:`, error);
        continue;
      }

      let lunchTotal = 0;
      let dinnerTotal = 0;
      let breakfastTotal = 0;

      logs?.forEach((log) => {
        lunchTotal += log.lunch_amount || 0;
        dinnerTotal += log.dinner_amount || 0;
        breakfastTotal += log.breakfast_amount || 0;
      });

      trends.push({
        month: `${targetMonth}월`,
        year: targetYear,
        fullMonth: `${targetYear}.${String(targetMonth).padStart(2, "0")}`,
        lunch: lunchTotal,
        dinner: dinnerTotal,
        breakfast: breakfastTotal,
        total: lunchTotal + dinnerTotal + breakfastTotal,
      });
    }

    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Trends API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
