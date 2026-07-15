import { NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  AttendanceActionError,
  getAttendanceForDate,
} from "@/lib/attendance-actions";

dayjs.extend(utc);
dayjs.extend(timezone);

// GET /api/attendance/today - 내 오늘 출퇴근 상태
export async function GET() {
  try {
    const today = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
    return NextResponse.json({
      data: (await getAttendanceForDate(today, true)) ?? null,
    });
  } catch (error) {
    if (error instanceof AttendanceActionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Attendance today API error:", error);
    return NextResponse.json(
      { error: "출퇴근 기록 조회 실패" },
      { status: 500 },
    );
  }
}
