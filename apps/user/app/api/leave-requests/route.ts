import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// POST /api/leave-requests - 휴가 신청 (승인 워크플로 연동)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      startDate,
      endDate,
      leaveTypeId,
      lateHour,
      lateMinute,
      ccMemberIds,
      reason,
    } = body;

    // 신청자는 세션에서 강제 (body 값 신뢰하지 않음)
    const memberId = sessionUser.id;

    if (!startDate || !leaveTypeId) {
      return NextResponse.json(
        { error: "startDate, leaveTypeId는 필수입니다." },
        { status: 400 }
      );
    }

    // 승인자 자동 결정
    const { data: approverId, error: rpcError } = await supabase.rpc(
      "get_approver_for_member",
      { p_member_id: memberId }
    );

    if (rpcError || !approverId) {
      console.error("Error getting approver:", rpcError);
      return NextResponse.json(
        { error: "승인자를 찾을 수 없습니다. 조직 구조를 확인해주세요." },
        { status: 400 }
      );
    }

    // 영업일 필터링을 위해 공휴일 조회
    const end = endDate || startDate;
    const { data: holidays } = await supabase
      .from("holidays")
      .select("holiday_date")
      .gte("holiday_date", startDate)
      .lte("holiday_date", end);

    const holidaySet = new Set(
      (holidays || []).map((h) => h.holiday_date)
    );

    // 시작일~종료일 범위에서 영업일만 추출
    const dates: string[] = [];
    const current = new Date(startDate + "T00:00:00");
    const last = new Date(end + "T00:00:00");

    while (current <= last) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split("T")[0]!;
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
        dates.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }

    if (dates.length === 0) {
      return NextResponse.json(
        { error: "선택한 기간에 영업일이 없습니다." },
        { status: 400 }
      );
    }

    // 각 영업일에 대해 dayoff 생성 (approval_status = 'pending')
    const dayoffRows = dates.map((date) => ({
      author_id: memberId,
      target_id: memberId,
      leave_date: date,
      leave_type_id: leaveTypeId,
      late_hour: leaveTypeId === 1 ? lateHour || null : null,
      late_minute: leaveTypeId === 1 ? lateMinute || null : null,
      cc_member_ids: ccMemberIds || [],
      reason: reason || null,
      approval_status: "pending",
    }));

    const { data: dayoffs, error: dayoffError } = await supabase
      .from("dayoffs")
      .insert(dayoffRows)
      .select();

    if (dayoffError || !dayoffs || dayoffs.length === 0) {
      console.error("Error creating dayoffs:", dayoffError);
      return NextResponse.json(
        { error: "휴가 등록 실패" },
        { status: 500 }
      );
    }

    // 각 dayoff에 대해 approval_request 생성
    const approvalRows = dayoffs.map((d) => ({
      type: "leave" as const,
      requester_id: memberId,
      approver_id: approverId,
      cc_member_ids: ccMemberIds || [],
      related_table: "dayoffs",
      related_id: d.id,
    }));

    const { data: approvals, error: approvalError } = await supabase
      .from("approval_requests")
      .insert(approvalRows)
      .select();

    if (approvalError) {
      console.error("Error creating approval requests:", approvalError);
      return NextResponse.json(
        { error: "승인 요청 생성 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        dayoffs,
        approvals,
        approver_id: approverId,
        dates_count: dates.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Leave request API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
