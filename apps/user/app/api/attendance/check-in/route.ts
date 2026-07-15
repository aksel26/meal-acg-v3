import { NextResponse } from "next/server";
import { AttendanceActionError, recordCheckIn } from "@/lib/attendance-actions";

export async function POST() {
  try {
    return NextResponse.json(await recordCheckIn(), { status: 201 });
  } catch (error) {
    if (error instanceof AttendanceActionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Check-in API error:", error);
    return NextResponse.json(
      { error: "출근 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
