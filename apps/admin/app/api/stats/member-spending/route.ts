import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { MonthlyAllowancesJson } from "@/lib/supabase/types";

// GET /api/stats/member-spending - 멤버별 지출 현황
export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("dashboard:read");
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    // get_user_monthly_stats RPC와 global_settings 병렬 조회
    const [statsResult, globalSettingsResult] = await Promise.all([
      supabase.rpc("get_user_monthly_stats", { p_year: year, p_month: month }),
      supabase.from("global_settings").select("monthly_allowances").eq("id", 1).single(),
    ]);

    const { data: stats, error } = statsResult;
    const { data: globalSettings } = globalSettingsResult;

    if (error) {
      throw error;
    }

    // 저장된 일일 단가 계산
    const monthlyAllowances = globalSettings?.monthly_allowances as MonthlyAllowancesJson | null;
    const savedData = monthlyAllowances?.[String(year)]?.[String(month)];
    const savedDailyAllowance = savedData && savedData.workdays > 0
      ? savedData.allowance / savedData.workdays
      : null;

    // 초과액 기준 정렬 (초과액 = 사용액 - 사용가능액)
    // 사용가능액 = 일일단가 × (근무일 - 휴일 - 재택 - 개별 + 주말)
    const sortedStats = (stats || [])
      .map((s: {
        user_id: string;
        full_name: string;
        total_used: number;
        total_allowance: number;
        work_days: number;
        holiday_count: number;
        remote_work_days: number;
        individual_meals: number;
        weekend_work_days: number;
        daily_allowance: number;
      }) => {
        const dailyAllowance = savedDailyAllowance ?? s.daily_allowance;
        const effectiveDays = (s.work_days || 0) - (s.holiday_count || 0) - (s.remote_work_days || 0) - (s.individual_meals || 0) + (s.weekend_work_days || 0);
        const totalAllowance = dailyAllowance * effectiveDays;
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
      .filter((s: { excess: number }) => s.excess > 0) // 초과액이 있는 멤버만
      .sort((a: { excess: number }, b: { excess: number }) => b.excess - a.excess);

    // 상위 5명 (초과액 기준)
    const topSpenders = sortedStats.slice(0, 5);

    // 평균 지출
    const totalUsed = sortedStats.reduce((sum: number, s: { totalUsed: number }) => sum + s.totalUsed, 0);
    const average = sortedStats.length > 0 ? Math.round(totalUsed / sortedStats.length) : 0;

    return NextResponse.json({
      members: topSpenders,
      average,
      totalMembers: sortedStats.length,
    });
  } catch (error) {
    console.error("Member spending API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
