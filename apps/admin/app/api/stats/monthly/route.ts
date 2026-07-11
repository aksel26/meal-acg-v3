import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { HIDDEN_MEMBER_NAMES } from "@/lib/constants";
import type { MonthlyAllowancesJson } from "@/lib/supabase/types";

type MealLogWeekendFields = {
  user_id: string;
  entry_date: string;
  attendance: string | null;
  lunch_store: string | null;
  lunch_amount: number | null;
  lunch_payer: string | null;
  dinner_store: string | null;
  dinner_amount: number | null;
  dinner_payer: string | null;
};

const hasMealEntry = (
  store: string | null | undefined,
  amount: number | null | undefined,
  payer: string | null | undefined,
) =>
  Boolean(store?.trim()) ||
  Boolean(payer?.trim()) ||
  Number(amount) > 0;

const isWeekendDate = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

const isWeekendWorkLog = (log: MealLogWeekendFields) => {
  const attendance = log.attendance?.trim();
  if (attendance !== "근무" && attendance !== "출근") return false;
  if (!isWeekendDate(log.entry_date)) return false;

  return (
    hasMealEntry(log.lunch_store, log.lunch_amount, log.lunch_payer) ||
    hasMealEntry(log.dinner_store, log.dinner_amount, log.dinner_payer)
  );
};

// GET /api/stats/monthly - Get monthly stats per user
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const userId = searchParams.get("userId");

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];
    let mealLogsQuery = supabase
      .from("meal_logs")
      .select(
        "user_id, entry_date, attendance, lunch_store, lunch_amount, lunch_payer, dinner_store, dinner_amount, dinner_payer",
      )
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);

    if (userId) {
      mealLogsQuery = mealLogsQuery.eq("user_id", userId);
    }

    // 서로 독립적인 쿼리 5개를 병렬 실행
    const [
      { data, error },
      { data: membersData, error: membersError },
      { data: settlementData, error: settlementError },
      { data: globalSettings, error: globalSettingsError },
      { data: mealLogsData, error: mealLogsError },
    ] = await Promise.all([
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
      supabase
        .from("global_settings")
        .select("monthly_allowances")
        .eq("id", 1)
        .single(),
      mealLogsQuery,
    ]);

    if (error) {
      console.error("Error fetching monthly stats:", error);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    if (membersError) {
      console.error("Error fetching members:", membersError);
    }

    // Create email map
    const emailMap = new Map<string, string | null>();
    (membersData || []).forEach((m: { id: string; email: string | null }) => {
      emailMap.set(m.id, m.email);
    });

    if (settlementError) {
      console.error("Error fetching settlement status:", settlementError);
    }

    // Create a map of user_id -> is_settled
    const settlementMap = new Map<string, boolean>();
    (settlementData || []).forEach((s: { user_id: string; is_settled: boolean }) => {
      settlementMap.set(s.user_id, s.is_settled);
    });

    if (globalSettingsError) {
      console.error("Error fetching global settings:", globalSettingsError);
    }

    const monthlyAllowances = globalSettings?.monthly_allowances as MonthlyAllowancesJson | null;
    const savedData = monthlyAllowances?.[String(year)]?.[String(month)];
    // 저장된 데이터에서 일일 단가 계산 (allowance / workdays)
    const savedDailyAllowance = savedData && savedData.workdays > 0
      ? savedData.allowance / savedData.workdays
      : null;

    if (mealLogsError) {
      console.error("Error fetching meal logs for weekend work:", mealLogsError);
    }

    const weekendWorkDaysByUser = new Map<string, number>();
    ((mealLogsData || []) as MealLogWeekendFields[]).forEach((log) => {
      if (!isWeekendWorkLog(log)) return;
      weekendWorkDaysByUser.set(
        log.user_id,
        (weekendWorkDaysByUser.get(log.user_id) || 0) + 1,
      );
    });

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
      const weekendWorkDays =
        mealLogsError
          ? user.weekend_work_days || 0
          : weekendWorkDaysByUser.get(user.user_id) || 0;
      // 사용가능액 = 일일단가 × (근무일 - 휴일 - 재택 - 개별 + 주말)
      const effectiveDays = (user.work_days || 0) - (user.holiday_count || 0) - (user.remote_work_days || 0) - (user.individual_meals || 0) + weekendWorkDays;
      const totalAllowance = dailyAllowance * effectiveDays;
      const balance = totalAllowance - user.total_used;

      return {
        ...user,
        weekend_work_days: weekendWorkDays,
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

    const filtered = transformedData.filter(
      (u: any) => !HIDDEN_MEMBER_NAMES.has(u.full_name)
    );
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Stats API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
