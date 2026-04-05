import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET /api/leave-balances?memberId=xxx&year=2026
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const year = searchParams.get("year");

    if (!memberId || !year) {
      return NextResponse.json(
        { error: "memberId, year는 필수입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("leave_balances")
      .select("id, member_id, year, type, granted, used, adjusted, note")
      .eq("member_id", memberId)
      .eq("year", parseInt(year))
      .order("type", { ascending: true });

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
