import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// GET /api/attendance/today - 오늘 출퇴근 현황 요약
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const today = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");

    // 전체 활성 멤버 수 (퇴사자 제외)
    const { data: allMembers, error: membersError } = await supabase
      .from("member_current_status")
      .select("member_id, full_name")
      .is("current_status", null);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return NextResponse.json(
        { error: "멤버 조회 실패", details: membersError.message },
        { status: 500 }
      );
    }

    const members = (allMembers ?? []) as { member_id: string; full_name: string }[];
    const total = members.length;
    const memberMap = new Map(members.map((m) => [m.member_id, m.full_name]));

    // 오늘 출퇴근 기록
    const { data: records, error: recordsError } = await supabase
      .from("attendance_records")
      .select("member_id, check_in_at, status")
      .eq("date", today);

    if (recordsError) {
      console.error("Error fetching today attendance:", recordsError);
      return NextResponse.json(
        { error: "출퇴근 기록 조회 실패", details: recordsError.message },
        { status: 500 }
      );
    }

    // 오늘 연차/휴가 수
    const { data: dayoffs, error: dayoffsError } = await supabase
      .from("dayoffs")
      .select("target_id")
      .eq("leave_date", today)
      .eq("is_deleted", false);

    if (dayoffsError) {
      console.error("Error fetching dayoffs:", dayoffsError);
    }

    const onLeave = (dayoffs ?? []).length;
    const onLeaveIds = new Set((dayoffs ?? []).map((d) => d.target_id));

    const checkedInIds = new Set(
      (records ?? [])
        .filter((r) => r.check_in_at !== null)
        .map((r) => r.member_id)
    );

    const lateIds = new Set(
      (records ?? [])
        .filter((r) => r.status === "late")
        .map((r) => r.member_id)
    );

    const checkedIn = checkedInIds.size;
    const late = lateIds.size;
    const notCheckedIn = Math.max(0, total - checkedIn - onLeave);

    const lateMembers = Array.from(lateIds)
      .filter((id) => memberMap.has(id))
      .map((id) => ({ id, name: memberMap.get(id)! }));

    const notCheckedInMembers = members
      .filter((m) => !checkedInIds.has(m.member_id) && !onLeaveIds.has(m.member_id))
      .map((m) => ({ id: m.member_id, name: m.full_name }));

    return NextResponse.json({
      total,
      checkedIn,
      notCheckedIn,
      late,
      onLeave,
      lateMembers,
      notCheckedInMembers,
    });
  } catch (error) {
    console.error("Attendance today API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
