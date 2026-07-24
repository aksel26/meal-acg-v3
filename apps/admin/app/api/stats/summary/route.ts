import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { requireAdmin } from "@/lib/auth";

type MonthlyStat =
  Database["public"]["Functions"]["get_user_monthly_stats"]["Returns"][number];

// GET /api/stats/summary - Get dashboard summary stats
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
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
      console.error("Error fetching stats:", error);
      return NextResponse.json(
        { error: "Failed to fetch stats" },
        { status: 500 },
      );
    }

    const monthlyStats = (stats || []) as MonthlyStat[];
    const totalMembers = monthlyStats.length;
    const totalAllowance =
      monthlyStats.reduce(
        (sum, member) => sum + (member.total_allowance || 0),
        0,
      ) || 0;
    const totalUsed =
      monthlyStats.reduce((sum, member) => sum + (member.total_used || 0), 0) ||
      0;
    const totalBalance =
      monthlyStats.reduce((sum, member) => sum + (member.balance || 0), 0) || 0;
    const averageUsage =
      totalMembers > 0 ? Math.round(totalUsed / totalMembers) : 0;

    return NextResponse.json({
      totalMembers,
      totalAllowance,
      totalUsed,
      totalBalance,
      averageUsage,
    });
  } catch (error) {
    console.error("Stats API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
