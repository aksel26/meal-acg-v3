import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// POST /api/attendance/check-out - 퇴근 체크아웃
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const { memberId } = await request.json();
    if (!memberId) {
      return NextResponse.json(
        { error: "memberId가 필요합니다." },
        { status: 400 }
      );
    }

    const today = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");

    // 오늘 레코드 조회
    const { data: record, error: fetchError } = await supabase
      .from("attendance_records")
      .select("id, check_in_at, check_out_at, status")
      .eq("member_id", memberId)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching attendance record:", fetchError);
      return NextResponse.json(
        { error: "출퇴근 기록 조회 실패", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!record?.check_in_at) {
      return NextResponse.json(
        { error: "출근 기록이 없습니다." },
        { status: 400 }
      );
    }

    const now = dayjs();
    const checkOutAt = now.toISOString();

    // 퇴근 가능 시각 = 출근 시각 + 9시간
    const checkInAt = dayjs(record.check_in_at);
    const expectedOut = checkInAt.add(9, "hour");

    // 조기 퇴근 여부
    const isEarlyLeave = now.isBefore(expectedOut);
    const status = isEarlyLeave ? "early_leave" : record.status ?? "normal";

    // 초과근무 계산: (퇴근 - 퇴근가능 - 2시간)을 분으로, 양수만
    const overtimeThreshold = expectedOut.add(2, "hour");
    const overtimeMs = now.valueOf() - overtimeThreshold.valueOf();
    const overtimeMinutes = overtimeMs > 0 ? Math.floor(overtimeMs / 60000) : 0;

    const { data, error } = await supabase
      .from("attendance_records")
      .update({
        check_out_at: checkOutAt,
        status,
        overtime_minutes: overtimeMinutes,
      })
      .eq("id", record.id)
      .select()
      .single();

    if (error) {
      console.error("Error checking out:", error);
      return NextResponse.json(
        { error: "퇴근 처리 실패", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Check-out API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
