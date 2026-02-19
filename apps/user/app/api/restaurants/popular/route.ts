export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/client";
import { NextResponse } from "next/server";
import type { PopularRestaurant } from "@/types/restaurant";

// GET: 전체 멤버의 누적 인기 음식점 조회
export async function GET() {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
    }

    // RPC 함수 호출 - DB 레벨에서 집계 수행
    const { data: popularRestaurants, error } = await supabase.rpc("get_popular_restaurants", {
      limit_count: 10,
    });

    if (error) {
      throw new Error(`인기 음식점 조회 실패: ${error.message}`);
    }

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
