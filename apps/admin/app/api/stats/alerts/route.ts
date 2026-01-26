import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/stats/alerts - 미입력/미처리 알림 데이터
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    // 해당 월의 시작일과 종료일
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // 해당 월의 마지막 날

    // 전체 멤버 수
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, full_name");

    if (membersError) {
      throw membersError;
    }

    // 해당 월에 식대 기록이 있는 멤버 ID 목록
    const { data: mealLogs, error: logsError } = await supabase
      .from("meal_logs")
      .select("user_id")
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);

    if (logsError) {
      throw logsError;
    }

    const memberIdsWithLogs = new Set(mealLogs?.map((log) => log.user_id) || []);

    // 미입력 멤버 목록
    const missingMembers = members?.filter((m) => !memberIdsWithLogs.has(m.id)) || [];

    // 오늘 기준 미입력 (오늘 업무일인데 기록이 없는 멤버)
    const today = new Date().toISOString().split("T")[0];
    const { data: todayLogs } = await supabase
      .from("meal_logs")
      .select("user_id")
      .eq("entry_date", today);

    const todayMemberIds = new Set(todayLogs?.map((log) => log.user_id) || []);
    const todayMissing = members?.filter((m) => !todayMemberIds.has(m.id)).length || 0;

    return NextResponse.json({
      totalMembers: members?.length || 0,
      missingMembersCount: missingMembers.length,
      missingMembers: missingMembers.slice(0, 5), // 최대 5명만
      todayMissing,
      month: `${year}년 ${month}월`,
    });
  } catch (error) {
    console.error("Alerts API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
