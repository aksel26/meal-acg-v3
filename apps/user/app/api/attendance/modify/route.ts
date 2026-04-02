import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET /api/attendance/modify?memberId=xxx - 내 수정 요청 목록
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

    const { data, error } = await supabase
      .from("attendance_modification_requests")
      .select(
        `
        *,
        attendance_record:attendance_records!attendance_modification_requests_attendance_record_id_fkey(
          id, date, attendance_type, check_in_at, check_out_at
        )
      `
      )
      .eq("requester_id", memberId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching modify requests:", error);
      return NextResponse.json(
        { error: "수정 요청 목록 조회 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Modify request GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/attendance/modify - 근태 수정 요청 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const { attendanceRecordId, requesterId, originalType, requestedType, reason } =
      await request.json();

    if (!attendanceRecordId || !requesterId || !originalType || !requestedType || !reason) {
      return NextResponse.json(
        { error: "모든 필드는 필수입니다." },
        { status: 400 }
      );
    }

    // 같은 레코드에 대해 진행 중인 요청이 있는지 확인
    const { data: existing } = await supabase
      .from("attendance_modification_requests")
      .select("id")
      .eq("attendance_record_id", attendanceRecordId)
      .in("approval_status", ["미승인", "가승인"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "이미 진행 중인 수정 요청이 있습니다." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("attendance_modification_requests")
      .insert({
        attendance_record_id: attendanceRecordId,
        requester_id: requesterId,
        original_type: originalType,
        requested_type: requestedType,
        reason,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating modify request:", error);
      return NextResponse.json(
        { error: "수정 요청 생성 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Modify request POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
