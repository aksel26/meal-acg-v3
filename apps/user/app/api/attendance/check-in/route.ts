import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// POST /api/attendance/check-in - 출근 체크인
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

    const nowKST = dayjs().tz("Asia/Seoul");
    const today = nowKST.format("YYYY-MM-DD");
    const hour = nowKST.hour();
    const minute = nowKST.minute();

    // 10:00 초과이면 지각
    const isLate = hour > 10 || (hour === 10 && minute > 0);
    const status = isLate ? "late" : "normal";

    // 주말 여부 (0=일, 6=토)
    const dayOfWeek = nowKST.day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 이미 출근한 경우 확인
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id, check_in_at")
      .eq("member_id", memberId)
      .eq("date", today)
      .maybeSingle();

    if (existing?.check_in_at) {
      return NextResponse.json(
        { error: "이미 출근했습니다." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(
        {
          member_id: memberId,
          date: today,
          check_in_at: now,
          status,
          is_weekend: isWeekend,
        },
        { onConflict: "member_id,date" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error checking in:", error);
      return NextResponse.json(
        { error: "출근 처리 실패", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Check-in API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
