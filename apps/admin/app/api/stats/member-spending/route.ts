import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/stats/member-spending - 멤버별 지출 현황
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    // get_user_monthly_stats RPC 사용
    const { data: stats, error } = await supabase.rpc("get_user_monthly_stats", {
      p_year: year,
      p_month: month,
    });

    if (error) {
      throw error;
    }

    // 지출 금액 기준 정렬
    const sortedStats = (stats || [])
      .map((s: { user_id: string; full_name: string; total_used: number; total_allowance: number }) => ({
        id: s.user_id,
        name: s.full_name,
        totalUsed: s.total_used || 0,
        totalAllowance: s.total_allowance || 0,
        usageRate: s.total_allowance > 0 ? ((s.total_used || 0) / s.total_allowance) * 100 : 0,
      }))
      .sort((a: { totalUsed: number }, b: { totalUsed: number }) => b.totalUsed - a.totalUsed);

    // 상위 5명
    const topSpenders = sortedStats.slice(0, 5);

    // 평균 지출
    const totalUsed = sortedStats.reduce((sum: number, s: { totalUsed: number }) => sum + s.totalUsed, 0);
    const average = sortedStats.length > 0 ? Math.round(totalUsed / sortedStats.length) : 0;

    return NextResponse.json({
      members: topSpenders,
      average,
      totalMembers: sortedStats.length,
    });
  } catch (error) {
    console.error("Member spending API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
