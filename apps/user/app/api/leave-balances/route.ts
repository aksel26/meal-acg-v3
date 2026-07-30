import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import { fetchLeaveBalances } from "@/lib/leave-balance-query";

// GET /api/leave-balances?year=2026 (본인 잔액만 조회)
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
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");

    // 조회 대상은 세션에서 강제 (본인 잔액만)
    const memberId = sessionUser.id;

    if (!year) {
      return NextResponse.json(
        { error: "year는 필수입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await fetchLeaveBalances(
      supabase,
      memberId,
      parseInt(year),
    );

    if (error) {
      console.error("Error fetching leave balances:", error);
      return NextResponse.json(
        { error: "연차 잔액 조회 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Leave balances API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
