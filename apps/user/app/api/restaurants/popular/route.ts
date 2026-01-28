export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export interface PopularRestaurant {
  name: string;
  count: number;
  percentage: number;
}

// GET: 전체 멤버의 누적 인기 음식점 조회
export async function GET() {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
    }

    // 전체 meal_logs에서 음식점 데이터 조회 (기간 제한 없음)
    const { data: mealLogs, error } = await supabase
      .from("meal_logs")
      .select("breakfast_store, lunch_store, dinner_store");

    if (error) {
      throw new Error(`식사 데이터 조회 실패: ${error.message}`);
    }

    // 음식점별 방문 횟수 집계
    const storeCount: Record<string, number> = {};

    (mealLogs || []).forEach((log) => {
      if (log.breakfast_store?.trim()) {
        const store = log.breakfast_store.trim();
        storeCount[store] = (storeCount[store] || 0) + 1;
      }
      if (log.lunch_store?.trim()) {
        const store = log.lunch_store.trim();
        storeCount[store] = (storeCount[store] || 0) + 1;
      }
      if (log.dinner_store?.trim()) {
        const store = log.dinner_store.trim();
        storeCount[store] = (storeCount[store] || 0) + 1;
      }
    });

    // 정렬 및 비율 계산
    const sorted = Object.entries(storeCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const totalVisits = sorted.reduce((sum, r) => sum + r.count, 0);

    const popularRestaurants: PopularRestaurant[] = sorted.slice(0, 10).map((r) => ({
      ...r,
      percentage: totalVisits > 0 ? Math.round((r.count / totalVisits) * 100) : 0,
    }));

    return NextResponse.json(
      {
        success: true,
        data: popularRestaurants,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Popular restaurants API error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
