import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/stats/monthly - Get monthly stats per user
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const userId = searchParams.get("userId");

    // Get monthly stats using the function
    const { data, error } = await supabase.rpc("get_user_monthly_stats", {
      p_year: year,
      p_month: month,
      p_user_id: userId || undefined,
    });

    if (error) {
      console.error("Error fetching monthly stats:", error);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    // Get settlement status for this month
    const { data: settlementData, error: settlementError } = await supabase
      .from("settlement_status")
      .select("user_id, is_settled")
      .eq("year", year)
      .eq("month", month);

    if (settlementError) {
      console.error("Error fetching settlement status:", settlementError);
    }

    // Create a map of user_id -> is_settled
    const settlementMap = new Map<string, boolean>();
    (settlementData || []).forEach((s: { user_id: string; is_settled: boolean }) => {
      settlementMap.set(s.user_id, s.is_settled);
    });

    // Transform data to include computed fields
    const transformedData = (data || []).map((user: {
      user_id: string;
      full_name: string;
      login_id: string;
      work_days: number;
      holiday_count: number;
      weekend_work_days: number;
      individual_meals: number;
      remote_work_days: number;
      daily_allowance: number;
      total_allowance: number;
      total_used: number;
      balance: number;
    }) => ({
      ...user,
      // has_excel_file: true if user has any meal records (total_used > 0)
      has_excel_file: user.total_used > 0,
      // is_settled: get from settlement_status table (manual management by admin)
      is_settled: settlementMap.get(user.user_id) || false,
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Stats API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
