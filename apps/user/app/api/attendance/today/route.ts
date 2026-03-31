import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// GET /api/attendance/today?memberId=xxx - 내 오늘 출퇴근 상태
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const memberId = request.nextUrl.searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json(
        { error: "memberId가 필요합니다." },
        { status: 400 }
      );
    }

    const today = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");

    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("member_id", memberId)
      .eq("date", today)
      .maybeSingle();

    if (error) {
      console.error("Error fetching today attendance:", error);
      return NextResponse.json(
        { error: "출퇴근 기록 조회 실패", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? null });
  } catch (error) {
    console.error("Attendance today API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
