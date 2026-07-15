import { NextRequest, NextResponse } from "next/server";
import {
  AttendanceActionError,
  getAttendanceForDate,
  recordCheckIn,
  recordCheckOut,
} from "@/lib/attendance-actions";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const today = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
    return NextResponse.json(await getAttendanceForDate(date, date === today));
  } catch (error) {
    if (error instanceof AttendanceActionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Attendance GET API error:", error);
    return NextResponse.json(
      { error: "출퇴근 기록 조회 실패" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "check_in") {
      return NextResponse.json(await recordCheckIn(), { status: 201 });
    }

    if (action === "check_out") {
      const earlyLeaveReason =
        typeof body.earlyLeaveReason === "string"
          ? body.earlyLeaveReason
          : undefined;
      return NextResponse.json(await recordCheckOut(earlyLeaveReason));
    }

    return NextResponse.json(
      { error: "action must be 'check_in' or 'check_out'" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof AttendanceActionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "요청 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    console.error("Attendance POST API error:", error);
    return NextResponse.json(
      { error: "출퇴근 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
