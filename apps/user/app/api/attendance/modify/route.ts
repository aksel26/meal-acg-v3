import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// GET /api/attendance/modify - 내 수정 요청 목록
// GET /api/attendance/modify?attendanceRecordId=xxx - 특정 근태 수정 요청
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const memberId = sessionUser.id;
    const attendanceRecordId =
      request.nextUrl.searchParams.get("attendanceRecordId");

    let query = supabase
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

    if (attendanceRecordId) {
      query = query.eq("attendance_record_id", attendanceRecordId).limit(1);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching modify requests:", error);
      return NextResponse.json(
        { error: "수정 요청 목록 조회 실패" },
        { status: 500 }
      );
    }

    if (attendanceRecordId) {
      return NextResponse.json(data?.[0] || null);
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
    // 요청자는 로그인 세션 본인으로 강제한다 (requesterId 위조 차단)
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const { attendanceRecordId, approverId, originalType, requestedType, reason } =
      await request.json();
    const requesterId = sessionUser.id;

    if (!attendanceRecordId || !approverId || !originalType || !requestedType || !reason) {
      return NextResponse.json(
        { error: "모든 필드는 필수입니다." },
        { status: 400 }
      );
    }

    const { data: approver, error: approverError } = await supabase
      .from("members")
      .select("id, member_role")
      .eq("id", approverId)
      .single();

    const approverRoles = ["대표", "본부장", "팀장", "파트장"];
    if (approverError || !approver || !approverRoles.includes(approver.member_role || "")) {
      return NextResponse.json(
        { error: "결재자는 팀장 이상만 선택할 수 있습니다." },
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
        first_approver_id: approverId,
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

    const { error: approvalError } = await supabase
      .from("approval_requests")
      .insert({
        type: "attendance_modify",
        requester_id: requesterId,
        approver_id: approverId,
        related_table: "attendance_modification_requests",
        related_id: data.id,
        status: "pending",
      });

    if (approvalError) {
      console.error("Error creating modify approval request:", approvalError);
      await supabase
        .from("attendance_modification_requests")
        .delete()
        .eq("id", data.id);
      return NextResponse.json(
        { error: "결재 요청 생성 실패" },
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
