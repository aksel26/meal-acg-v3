import { NextRequest, NextResponse } from "next/server";
import {
  AttendanceActionError,
  recordCheckOut,
} from "@/lib/attendance-actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const earlyLeaveReason =
      typeof body.earlyLeaveReason === "string"
        ? body.earlyLeaveReason
        : undefined;

    return NextResponse.json(await recordCheckOut(earlyLeaveReason));
  } catch (error) {
    if (error instanceof AttendanceActionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Check-out API error:", error);
    return NextResponse.json(
      { error: "퇴근 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
