import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { HIDDEN_MEMBER_NAMES } from "@/lib/constants";
import type { UserMonthlyStat } from "@/lib/supabase/types";

// GET /api/stats/monthly - Get monthly stats per user
// 사용가능액·잔액·주말/공휴일 근무 일수는 user_monthly_stats 뷰가 계산한다. 여기서는 그 값을 그대로 쓴다.
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

    // Get members to fetch email addresses
    const { data: membersData, error: membersError } = await supabase
      .from("members")
      .select("id, email");

    if (membersError) {
      console.error("Error fetching members:", membersError);
    }

    // Create email map
    const emailMap = new Map<string, string | null>();
    (membersData || []).forEach((m: { id: string; email: string | null }) => {
      emailMap.set(m.id, m.email);
    });

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

    const transformedData = ((data || []) as UserMonthlyStat[]).map((user) => ({
      ...user,
      // has_excel_file: true if user has any meal records (total_used > 0)
      has_excel_file: user.total_used > 0,
      // is_settled: get from settlement_status table (manual management by admin)
      is_settled: settlementMap.get(user.user_id) || false,
      // email: from members table
      email: emailMap.get(user.user_id) || null,
    }));

    const filtered = transformedData.filter((u) => !HIDDEN_MEMBER_NAMES.has(u.full_name));
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Stats API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
