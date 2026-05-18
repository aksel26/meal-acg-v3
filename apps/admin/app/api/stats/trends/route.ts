import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/stats/trends - 월별 평균 초과금 추이 데이터 (현재 월 기준 최근 6개월)
export async function GET() {
  try {
    await requireAdminPermission("dashboard:read");
    const supabase = createServiceClient();

    // 현재 날짜 기준으로 6개월치 (선택한 월과 무관)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const trends = [];

    // 현재 월 기준 최근 6개월 데이터 수집
    for (let i = 5; i >= 0; i--) {
      let targetMonth = currentMonth - i;
      let targetYear = currentYear;

      if (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }

      // 해당 월의 멤버별 통계 조회
      const { data: stats, error } = await supabase.rpc("get_user_monthly_stats", {
        p_year: targetYear,
        p_month: targetMonth,
      });

      if (error) {
        console.error(`Error fetching stats for ${targetYear}-${targetMonth}:`, error);
        trends.push({
          month: `${targetMonth}월`,
          year: targetYear,
          fullMonth: `${targetYear}.${String(targetMonth).padStart(2, "0")}`,
          averageExcess: 0,
          totalExcess: 0,
          memberCount: 0,
        });
        continue;
      }

      // DB 함수가 계산한 balance를 직접 사용 (반차, 공휴일 등 모든 요소 반영됨)
      const memberCount = stats?.length || 0;
      const totalExcess = stats?.reduce(
        (sum: number, s: { balance: number }) => sum + (-(s.balance || 0)),
        0
      ) || 0;

      const averageExcess = memberCount > 0 ? Math.round(totalExcess / memberCount) : 0;

      trends.push({
        month: `${targetMonth}월`,
        year: targetYear,
        fullMonth: `${targetYear}.${String(targetMonth).padStart(2, "0")}`,
        averageExcess,
        totalExcess,
        memberCount,
      });
    }

    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Trends API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
