import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { MonthlyAllowancesJson } from "@/lib/supabase/types";

// GET /api/stats/summary - Get dashboard summary stats
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    // Get monthly stats using the function
    const [statsResult, globalSettingsResult] = await Promise.all([
      supabase.rpc("get_user_monthly_stats", { p_year: year, p_month: month }),
      supabase.from("global_settings").select("monthly_allowances").eq("id", 1).single(),
    ]);

    const { data: stats, error } = statsResult;
    const { data: globalSettings, error: globalSettingsError } = globalSettingsResult;

    if (error) {
      console.error("Error fetching stats:", error);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    if (globalSettingsError) {
      console.error("Error fetching global settings:", globalSettingsError);
    }

    // Get saved monthly allowance from global_settings
    const monthlyAllowances = globalSettings?.monthly_allowances as MonthlyAllowancesJson | null;
    const savedData = monthlyAllowances?.[String(year)]?.[String(month)];
    // 저장된 데이터에서 일일 단가 계산 (allowance / workdays)
    const savedDailyAllowance = savedData && savedData.workdays > 0
      ? savedData.allowance / savedData.workdays
      : null;

    // Calculate summary
    const totalMembers = stats?.length || 0;
    // 사용가능액 = 일일단가 × (근무일 - 휴일 - 재택 - 개별 + 주말)
    const totalAllowance = stats?.reduce((sum: number, s: {
      work_days: number;
      holiday_count: number;
      remote_work_days: number;
      individual_meals: number;
      weekend_work_days: number;
      daily_allowance: number;
      total_allowance: number;
    }) => {
      const dailyAllowance = savedDailyAllowance ?? s.daily_allowance;
      const effectiveDays = (s.work_days || 0) - (s.holiday_count || 0) - (s.remote_work_days || 0) - (s.individual_meals || 0) + (s.weekend_work_days || 0);
      return sum + (dailyAllowance * effectiveDays);
    }, 0) || 0;
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
