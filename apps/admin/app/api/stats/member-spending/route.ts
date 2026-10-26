import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserMonthlyStat } from "@/lib/supabase/types";

// GET /api/stats/member-spending - 멤버별 지출 현황
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    // 사용가능액은 user_monthly_stats 뷰가 계산한 total_allowance를 그대로 쓴다
    const { data: stats, error } = await supabase.rpc("get_user_monthly_stats", {
      p_year: year,
      p_month: month,
    });

    if (error) {
      throw error;
    }

    // 초과액 기준 정렬 (초과액 = 사용액 - 사용가능액)
    const sortedStats = ((stats || []) as UserMonthlyStat[])
      .map((s) => {
        const totalAllowance = s.total_allowance || 0;
        const totalUsed = s.total_used || 0;
        return {
          id: s.user_id,
          name: s.full_name,
          totalUsed,
          totalAllowance,
          excess: totalUsed - totalAllowance,
          usageRate: totalAllowance > 0 ? (totalUsed / totalAllowance) * 100 : 0,
        };
      })
      .filter((s) => s.excess > 0) // 초과액이 있는 멤버만
      .sort((a, b) => b.excess - a.excess);

    // 상위 5명 (초과액 기준)
    const topSpenders = sortedStats.slice(0, 5);

    // 평균 지출
    const totalUsed = sortedStats.reduce((sum, s) => sum + s.totalUsed, 0);
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
