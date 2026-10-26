import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { UserMonthlyStat } from "@/lib/supabase/types";

// GET /api/stats/summary - Get dashboard summary stats
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    // Get monthly stats using the function
    // 사용가능액은 user_monthly_stats 뷰가 계산한 total_allowance를 그대로 쓴다
    const { data: stats, error } = await supabase.rpc("get_user_monthly_stats", {
      p_year: year,
      p_month: month,
    });

    if (error) {
      console.error("Error fetching stats:", error);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    // Calculate summary
    const rows = (stats || []) as UserMonthlyStat[];
    const totalMembers = rows.length;
    const totalAllowance = rows.reduce((sum, s) => sum + (s.total_allowance || 0), 0);
    const totalUsed = rows.reduce((sum, s) => sum + (s.total_used || 0), 0);
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
