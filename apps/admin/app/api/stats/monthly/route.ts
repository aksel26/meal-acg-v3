import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { requireAdmin } from "@/lib/auth";
import { HIDDEN_MEMBER_NAMES } from "@/lib/constants";

type MonthlyStat =
  Database["public"]["Functions"]["get_user_monthly_stats"]["Returns"][number];

// GET /api/stats/monthly - Get monthly stats per user
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const year = Number(searchParams.get("year") || new Date().getFullYear());
    const month = Number(
      searchParams.get("month") || new Date().getMonth() + 1,
    );
    const userId = searchParams.get("userId");

    const [statsResult, membersResult, settlementResult] = await Promise.all([
      supabase.rpc("get_user_monthly_stats", {
        p_year: year,
        p_month: month,
        p_user_id: userId || undefined,
      }),
      supabase.from("members").select("id, email"),
      supabase
        .from("settlement_status")
        .select("user_id, is_settled")
        .eq("year", year)
        .eq("month", month),
    ]);

    if (statsResult.error) {
      console.error("Error fetching monthly stats:", statsResult.error);
      return NextResponse.json(
        { error: "Failed to fetch stats" },
        { status: 500 },
      );
    }
    if (membersResult.error) {
      console.error("Error fetching members:", membersResult.error);
    }
    if (settlementResult.error) {
      console.error(
        "Error fetching settlement status:",
        settlementResult.error,
      );
    }

    const emailMap = new Map(
      (membersResult.data || []).map((member) => [member.id, member.email]),
    );
    const settlementMap = new Map(
      (settlementResult.data || []).map((status) => [
        status.user_id,
        status.is_settled,
      ]),
    );

    const data = ((statsResult.data || []) as MonthlyStat[])
      .filter((stats) => !HIDDEN_MEMBER_NAMES.has(stats.full_name))
      .map((stats) => ({
        ...stats,
        has_excel_file: stats.total_used > 0,
        is_settled: settlementMap.get(stats.user_id) || false,
        email: emailMap.get(stats.user_id) || null,
      }));

    return NextResponse.json(data);
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
