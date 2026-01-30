import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { MonthlyAllowancesJson } from "@/lib/supabase/types";

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

    // Get saved monthly allowance from global_settings
    const { data: globalSettings, error: globalSettingsError } = await supabase
      .from("global_settings")
      .select("monthly_allowances")
      .eq("id", 1)
      .single();

    if (globalSettingsError) {
      console.error("Error fetching global settings:", globalSettingsError);
    }

    const monthlyAllowances = globalSettings?.monthly_allowances as MonthlyAllowancesJson | null;
    const savedData = monthlyAllowances?.[String(year)]?.[String(month)];
    // 저장된 데이터에서 일일 단가 계산 (allowance / workdays)
    const savedDailyAllowance = savedData && savedData.workdays > 0
      ? savedData.allowance / savedData.workdays
      : null;

    // Transform data to include computed fields
    // 사용가능액 = 일일단가 × (근무일 - 휴일 - 개별 + 주말)
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
    }) => {
      // 일일 단가: 저장된 값 또는 RPC에서 받은 값
      const dailyAllowance = savedDailyAllowance ?? user.daily_allowance;
      // 사용가능액 = 일일단가 × (근무일 - 휴일 - 재택 - 개별 + 주말)
      const effectiveDays = (user.work_days || 0) - (user.holiday_count || 0) - (user.remote_work_days || 0) - (user.individual_meals || 0) + (user.weekend_work_days || 0);
      const totalAllowance = dailyAllowance * effectiveDays;
      const balance = totalAllowance - user.total_used;

      return {
        ...user,
        // Override with saved allowance if available
        total_allowance: totalAllowance,
        balance: balance,
        // has_excel_file: true if user has any meal records (total_used > 0)
        has_excel_file: user.total_used > 0,
        // is_settled: get from settlement_status table (manual management by admin)
        is_settled: settlementMap.get(user.user_id) || false,
        // email: from members table
        email: emailMap.get(user.user_id) || null,
      };
    });

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Stats API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
