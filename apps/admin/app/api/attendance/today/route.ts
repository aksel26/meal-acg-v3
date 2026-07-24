import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { APPROVED_LEAVE_STATUSES } from "utils/leave-status";

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
        { status: 500 },
      );
    }

    const members = (allMembers ?? []) as {
      member_id: string;
      full_name: string;
    }[];
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
        { status: 500 },
      );
    }

    // 오늘 승인된 종일 휴가/반차
    const { data: dayoffs, error: dayoffsError } = await supabase
      .from("dayoffs")
      .select(
        "target_id, leave_type:leave_types!dayoffs_leave_type_id_fkey(category, duration_type, include_in_stats)",
      )
      .eq("leave_date", today)
      .eq("is_deleted", false)
      .in("approval_status", [...APPROVED_LEAVE_STATUSES]);

    if (dayoffsError) {
      console.error("Error fetching dayoffs:", dayoffsError);
    }

    type LeaveType = {
      category: string;
      duration_type: string;
      include_in_stats: boolean;
    };
    const fullDayLeaveIds = new Set<string>();
    const halfDayLeaveIds = new Set<string>();
    for (const row of dayoffs ?? []) {
      const relation = (
        row as unknown as {
          leave_type: LeaveType | LeaveType[] | null;
        }
      ).leave_type;
      const leaveType = Array.isArray(relation) ? relation[0] : relation;
      if (
        !memberMap.has(row.target_id) ||
        !leaveType?.include_in_stats ||
        leaveType.category === "지각/조퇴"
      ) {
        continue;
      }
      if (leaveType.duration_type === "full") {
        fullDayLeaveIds.add(row.target_id);
      } else {
        halfDayLeaveIds.add(row.target_id);
      }
    }

    const checkedInIds = new Set(
      (records ?? [])
        .filter((r) => r.check_in_at !== null)
        .map((r) => r.member_id),
    );

    const lateIds = new Set(
      (records ?? [])
        .filter((r) => r.status === "late")
        .map((r) => r.member_id),
    );
    const earlyCheckInIds = new Set(
      (records ?? [])
        .filter((r) => r.status === "early_check_in")
        .map((r) => r.member_id),
    );

    const checkedIn = checkedInIds.size;
    const earlyCheckIn = earlyCheckInIds.size;
    const late = lateIds.size;

    const lateMembers = Array.from(lateIds)
      .filter((id) => memberMap.has(id))
      .map((id) => ({ id, name: memberMap.get(id)! }));

    const notCheckedInMembers = members
      .filter(
        (m) =>
          !checkedInIds.has(m.member_id) &&
          !fullDayLeaveIds.has(m.member_id) &&
          !halfDayLeaveIds.has(m.member_id),
      )
      .map((m) => ({ id: m.member_id, name: m.full_name }));
    const leaveMembers = Array.from(fullDayLeaveIds).map((id) => ({
      id,
      name: memberMap.get(id)!,
    }));
    const halfDayLeaveMembers = Array.from(halfDayLeaveIds).map((id) => ({
      id,
      name: memberMap.get(id)!,
    }));

    return NextResponse.json({
      total,
      checkedIn,
      earlyCheckIn,
      notCheckedIn: notCheckedInMembers.length,
      late,
      onLeave: fullDayLeaveIds.size,
      halfDayLeave: halfDayLeaveIds.size,
      lateMembers,
      notCheckedInMembers,
      leaveMembers,
      halfDayLeaveMembers,
    });
  } catch (error) {
    console.error("Attendance today API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
