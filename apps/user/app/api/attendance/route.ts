import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET /api/attendance?memberId=xxx&date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const date = searchParams.get("date");

    if (!memberId || !date) {
      return NextResponse.json(
        { error: "memberId and date are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("member_id", memberId)
      .eq("date", date)
      .maybeSingle();

    if (error) {
      console.error("Error fetching attendance:", error);
      return NextResponse.json(
        { error: "Failed to fetch attendance" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Attendance API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/attendance - 출근/퇴근 기록
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

    const { memberId, action, earlyLeaveReason } = await request.json();

    if (!memberId || !action) {
      return NextResponse.json(
        { error: "memberId and action are required" },
        { status: 400 }
      );
    }

    if (action !== "check_in" && action !== "check_out") {
      return NextResponse.json(
        { error: "action must be 'check_in' or 'check_out'" },
        { status: 400 }
      );
    }

    // KST 기준 오늘 날짜
    const now = new Date();
    const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]!;

    if (action === "check_in") {
      // UPSERT: 오늘 레코드가 없으면 생성, 있으면 이미 출근한 것
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("id, check_in_at")
        .eq("member_id", memberId)
        .eq("date", kstDate)
        .maybeSingle();

      if (existing?.check_in_at) {
        return NextResponse.json(
          { error: "이미 출근 처리되었습니다." },
          { status: 409 }
        );
      }

      const { data, error } = await supabase
        .from("attendance_records")
        .upsert(
          {
            member_id: memberId,
            date: kstDate,
            check_in_at: now.toISOString(),
          },
          { onConflict: "member_id,date" }
        )
        .select()
        .single();

      if (error) {
        console.error("Error checking in:", error);
        return NextResponse.json(
          { error: `출근 처리에 실패했습니다: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json(data, { status: 201 });
    }

    // check_out
    const { data: record } = await supabase
      .from("attendance_records")
      .select("id, check_in_at, check_out_at")
      .eq("member_id", memberId)
      .eq("date", kstDate)
      .maybeSingle();

    if (!record?.check_in_at) {
      return NextResponse.json(
        { error: "출근 기록이 없습니다. 먼저 출근해주세요." },
        { status: 400 }
      );
    }

    if (record.check_out_at) {
      return NextResponse.json(
        { error: "이미 퇴근 처리되었습니다." },
        { status: 409 }
      );
    }

    // 조기퇴근 판단: 출근 + 9시간 전에 퇴근하면 조퇴
    const checkInTime = new Date(record.check_in_at).getTime();
    const expectedOutTime = checkInTime + 9 * 60 * 60 * 1000;
    const isEarlyLeave = now.getTime() < expectedOutTime;

    // 초과근무 계산: (퇴근 - 퇴근가능 - 2시간), 양수만
    const overtimeThreshold = expectedOutTime + 2 * 60 * 60 * 1000;
    const overtimeMs = now.getTime() - overtimeThreshold;
    const overtimeMinutes = overtimeMs > 0 ? Math.floor(overtimeMs / 60000) : 0;

    const status = isEarlyLeave ? "early_leave" : "normal";

    const updateFields: Record<string, unknown> = {
      check_out_at: now.toISOString(),
      status,
      overtime_minutes: overtimeMinutes,
    };

    // 정상 퇴근: 자동 최종승인
    if (!isEarlyLeave) {
      updateFields.approved_at = now.toISOString();
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .update(updateFields)
      .eq("id", record.id)
      .select()
      .single();

    if (error) {
      console.error("Error checking out:", error);
      return NextResponse.json(
        { error: "퇴근 처리에 실패했습니다." },
        { status: 500 }
      );
    }

    // 조기퇴근: early_leave_requests 생성
    if (isEarlyLeave && earlyLeaveReason) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: reqError } = await (supabase as any)
        .from("early_leave_requests")
        .insert({
          attendance_record_id: record.id,
          requester_id: memberId,
          reason: earlyLeaveReason,
          approval_status: "pending",
        });

      if (reqError) {
        console.error("Error creating early leave request:", reqError);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Attendance API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
