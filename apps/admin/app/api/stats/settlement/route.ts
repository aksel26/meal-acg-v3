import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/stats/settlement - 정산 현황 통계
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    // 멤버와 정산 상태를 병렬로 조회
    const [membersResult, settlementResult] = await Promise.all([
      supabase.from("members").select("id, full_name"),
      supabase
        .from("settlement_status")
        .select("user_id, is_settled")
        .eq("year", year)
        .eq("month", month),
    ]);

    const { data: members, error: membersError } = membersResult;
    const { data: settlements, error: settlementError } = settlementResult;

    if (membersError) {
      throw membersError;
    }

    if (settlementError) {
      throw settlementError;
    }

    // 정산 완료된 user_id Set
    const settledUserIds = new Set(
      settlements?.filter((s) => s.is_settled).map((s) => s.user_id) || []
    );

    // 정산 완료/미정산 멤버 분류
    const settledMembers = members?.filter((m) => settledUserIds.has(m.id)) || [];
    const unsettledMembers = members?.filter((m) => !settledUserIds.has(m.id)) || [];

    return NextResponse.json({
      totalMembers: members?.length || 0,
      settledCount: settledMembers.length,
      unsettledCount: unsettledMembers.length,
      settledMembers: settledMembers.slice(0, 5),
      unsettledMembers: unsettledMembers.slice(0, 5),
      month: `${year}년 ${month}월`,
    });
  } catch (error) {
    console.error("Settlement stats API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
