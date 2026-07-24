import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type MonthlyStat =
  Database["public"]["Functions"]["get_user_monthly_stats"]["Returns"][number];

// GET /api/stats/member-spending - 멤버별 지출 현황
export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("dashboard:read");
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(
      searchParams.get("year") || new Date().getFullYear().toString(),
    );
    const month = parseInt(
      searchParams.get("month") || (new Date().getMonth() + 1).toString(),
    );

    const { data: stats, error } = await supabase.rpc(
      "get_user_monthly_stats",
      { p_year: year, p_month: month },
    );

    if (error) {
      throw error;
    }

    // 초과액 기준 정렬 (초과액 = 사용액 - 사용가능액)
    const sortedStats = ((stats || []) as MonthlyStat[])
      .map((stats) => {
        const totalAllowance = stats.total_allowance || 0;
        const totalUsed = stats.total_used || 0;
        return {
          id: stats.user_id,
          name: stats.full_name,
          totalUsed,
          totalAllowance,
          excess: totalUsed - totalAllowance,
          usageRate:
            totalAllowance > 0 ? (totalUsed / totalAllowance) * 100 : 0,
        };
      })
      .filter((s: { excess: number }) => s.excess > 0) // 초과액이 있는 멤버만
      .sort(
        (a: { excess: number }, b: { excess: number }) => b.excess - a.excess,
      );

    // 상위 5명 (초과액 기준)
    const topSpenders = sortedStats.slice(0, 5);

    // 평균 지출
    const totalUsed = sortedStats.reduce(
      (sum: number, s: { totalUsed: number }) => sum + s.totalUsed,
      0,
    );
    const average =
      sortedStats.length > 0 ? Math.round(totalUsed / sortedStats.length) : 0;

    return NextResponse.json({
      members: topSpenders,
      average,
      totalMembers: sortedStats.length,
    });
  } catch (error) {
    console.error("Member spending API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
