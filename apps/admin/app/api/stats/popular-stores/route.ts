import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface StoreStats {
  name: string;
  count: number;
  totalAmount: number;
}

// GET /api/stats/popular-stores - 인기 가게 TOP 5
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    // 해당 월의 모든 meal_logs 가져오기
    const { data: logs, error } = await supabase
      .from("meal_logs")
      .select("lunch_store, lunch_amount, dinner_store, dinner_amount, breakfast_store, breakfast_amount")
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);

    if (error) {
      throw error;
    }

    // 가게별 통계 집계
    const storeMap = new Map<string, { count: number; totalAmount: number }>();

    logs?.forEach((log) => {
      // 중식
      if (log.lunch_store) {
        const store = storeMap.get(log.lunch_store) || { count: 0, totalAmount: 0 };
        store.count += 1;
        store.totalAmount += log.lunch_amount || 0;
        storeMap.set(log.lunch_store, store);
      }
      // 석식
      if (log.dinner_store) {
        const store = storeMap.get(log.dinner_store) || { count: 0, totalAmount: 0 };
        store.count += 1;
        store.totalAmount += log.dinner_amount || 0;
        storeMap.set(log.dinner_store, store);
      }
      // 조식
      if (log.breakfast_store) {
        const store = storeMap.get(log.breakfast_store) || { count: 0, totalAmount: 0 };
        store.count += 1;
        store.totalAmount += log.breakfast_amount || 0;
        storeMap.set(log.breakfast_store, store);
      }
    });

    // 방문 횟수 기준 정렬 후 TOP 5
    const stores: StoreStats[] = Array.from(storeMap.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        totalAmount: stats.totalAmount,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({ stores });
  } catch (error) {
    console.error("Popular stores API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
