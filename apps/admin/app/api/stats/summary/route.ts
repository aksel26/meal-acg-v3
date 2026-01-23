import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/stats/summary - Get dashboard summary stats
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    // Get monthly stats using the function
    const { data: stats, error } = await supabase.rpc("get_user_monthly_stats", {
      p_year: year,
      p_month: month,
    });

    if (error) {
      console.error("Error fetching stats:", error);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    // Calculate summary
    const totalMembers = stats?.length || 0;
    const totalAllowance = stats?.reduce((sum: number, s: { total_allowance: number }) => sum + (s.total_allowance || 0), 0) || 0;
    const totalUsed = stats?.reduce((sum: number, s: { total_used: number }) => sum + (s.total_used || 0), 0) || 0;
    const totalBalance = totalAllowance - totalUsed;
    const averageUsage = totalMembers > 0 ? Math.round(totalUsed / totalMembers) : 0;

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
