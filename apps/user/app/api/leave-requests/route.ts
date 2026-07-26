import { NextRequest, NextResponse } from "next/server";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";

dayjs.extend(utc);
dayjs.extend(timezone);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const APPROVER_ROLES = new Set(["대표", "본부장", "팀장", "파트장"]);
const APPROVER_AUTHORITIES = new Set(["관리자", "팀장", "팀장/본부장"]);

type ApproverCandidate = {
  id: string;
  full_name: string;
  member_role: string | null;
  user_authority: string | null;
  team: { name: string } | null;
};

function isEligibleApprover(candidate: ApproverCandidate, requesterId: string) {
  return (
    candidate.id !== requesterId &&
    (APPROVER_ROLES.has(candidate.member_role ?? "") ||
      APPROVER_AUTHORITIES.has(candidate.user_authority ?? ""))
  );
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function getRpcErrorResponse(message: string) {
  if (message.includes("LEAVE_REQUEST_DUPLICATE_DATE")) {
    return NextResponse.json(
      { error: "이미 신청했거나 승인된 휴가 날짜가 포함되어 있습니다." },
      { status: 409 },
    );
  }
  if (message.includes("LEAVE_REQUEST_IDEMPOTENCY_CONFLICT")) {
    return NextResponse.json(
      { error: "동일한 요청 식별자가 다른 신청에 사용되었습니다." },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: "휴가 신청 저장에 실패했습니다." },
    { status: 500 },
  );
}

// GET /api/leave-requests - 같은 조직의 선택 가능한 승인자/참조자 목록
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const { data: requester, error: requesterError } = await supabase
      .from("members")
      .select("organization_id")
      .eq("id", sessionUser.id)
      .single();

    if (requesterError || !requester?.organization_id) {
      return NextResponse.json(
        { error: "조직 정보를 확인할 수 없습니다." },
        { status: 400 },
      );
    }

    const [
      { data: members, error: membersError },
      { data: defaultApproverId },
    ] = await Promise.all([
      supabase
        .from("members")
        .select(
          "id, full_name, member_role, user_authority, team:teams!members_team_id_fkey(name)",
        )
        .eq("organization_id", requester.organization_id)
        .order("full_name"),
      supabase.rpc("get_approver_for_member", {
        p_member_id: sessionUser.id,
      }),
    ]);

    if (membersError) {
      console.error("Leave approver list lookup failed:", membersError);
      return NextResponse.json(
        { error: "승인자 목록을 불러오지 못했습니다." },
        { status: 500 },
      );
    }

    const candidates =
      (members as ApproverCandidate[] | null | undefined) ?? [];
    const memberOptions = candidates
      .filter((candidate) => candidate.id !== sessionUser.id)
      .map((candidate) => ({
        id: candidate.id,
        full_name: candidate.full_name,
        member_role: candidate.member_role,
        team_name: candidate.team?.name ?? null,
      }));
    const approvers = candidates
      .filter((candidate) => isEligibleApprover(candidate, sessionUser.id))
      .map((candidate) => ({
        id: candidate.id,
        full_name: candidate.full_name,
        member_role: candidate.member_role,
        team_name: candidate.team?.name ?? null,
      }));

    return NextResponse.json({
      approvers,
      members: memberOptions,
      default_approver_id: approvers.some(
        (approver) => approver.id === defaultApproverId,
      )
        ? defaultApproverId
        : null,
    });
  } catch (error) {
    console.error("Leave approver list API error:", error);
    return NextResponse.json(
      { error: "승인자 목록 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// POST /api/leave-requests - 휴가 신청 (승인 워크플로 연동)
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const startDate = body.startDate;
    const endDate = body.endDate || startDate;
    const leaveTypeId = Number(body.leaveTypeId);
    const ccMemberIds = body.ccMemberIds ?? [];
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const requestId = body.requestId ?? crypto.randomUUID();
    const selectedApproverId = body.approverId;

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return NextResponse.json(
        { error: "날짜는 YYYY-MM-DD 형식의 유효한 값이어야 합니다." },
        { status: 400 },
      );
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "종료일은 시작일보다 빠를 수 없습니다." },
        { status: 400 },
      );
    }

    const today = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
    if (startDate < today) {
      return NextResponse.json(
        { error: "과거 날짜로 휴가를 신청할 수 없습니다." },
        { status: 400 },
      );
    }
    if (dayjs(endDate).diff(dayjs(startDate), "day") > 366) {
      return NextResponse.json(
        { error: "휴가 신청 기간은 최대 1년입니다." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(leaveTypeId)) {
      return NextResponse.json(
        { error: "유효한 휴가 유형이 필요합니다." },
        { status: 400 },
      );
    }
    if (
      !Array.isArray(ccMemberIds) ||
      ccMemberIds.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))
    ) {
      return NextResponse.json(
        { error: "유효하지 않은 참조자입니다." },
        { status: 400 },
      );
    }
    if (typeof requestId !== "string" || !UUID_PATTERN.test(requestId)) {
      return NextResponse.json(
        { error: "유효하지 않은 요청 식별자입니다." },
        { status: 400 },
      );
    }
    if (
      typeof selectedApproverId !== "string" ||
      !UUID_PATTERN.test(selectedApproverId)
    ) {
      return NextResponse.json(
        { error: "승인자를 선택해주세요." },
        { status: 400 },
      );
    }
    if (reason.length > 2000) {
      return NextResponse.json(
        { error: "사유는 2,000자 이내여야 합니다." },
        { status: 400 },
      );
    }

    const { data: leaveType, error: leaveTypeError } = await supabase
      .from("leave_types")
      .select("id, category")
      .eq("id", leaveTypeId)
      .single();

    if (leaveTypeError || !leaveType || leaveType.category === "지각/조퇴") {
      return NextResponse.json(
        { error: "휴가 신청에 사용할 수 없는 유형입니다." },
        { status: 400 },
      );
    }

    const memberId = sessionUser.id;
    const { data: requester, error: requesterError } = await supabase
      .from("members")
      .select("organization_id")
      .eq("id", memberId)
      .single();

    if (requesterError || !requester?.organization_id) {
      return NextResponse.json(
        { error: "신청자의 조직 정보를 확인할 수 없습니다." },
        { status: 400 },
      );
    }

    const uniqueCcMemberIds = [...new Set(ccMemberIds)];
    if (
      uniqueCcMemberIds.length !== ccMemberIds.length ||
      uniqueCcMemberIds.includes(memberId)
    ) {
      return NextResponse.json(
        { error: "유효하지 않은 참조자입니다." },
        { status: 400 },
      );
    }
    if (uniqueCcMemberIds.length > 0) {
      const { data: ccMembers, error: ccMembersError } = await supabase
        .from("members")
        .select("id")
        .eq("organization_id", requester.organization_id)
        .in("id", uniqueCcMemberIds);

      if (ccMembersError || ccMembers?.length !== uniqueCcMemberIds.length) {
        return NextResponse.json(
          { error: "같은 조직의 구성원만 참조자로 지정할 수 있습니다." },
          { status: 400 },
        );
      }
    }

    const { data: selectedApprover, error: approverError } = await supabase
      .from("members")
      .select(
        "id, full_name, member_role, user_authority, organization_id, team:teams!members_team_id_fkey(name)",
      )
      .eq("id", selectedApproverId)
      .eq("organization_id", requester.organization_id)
      .single();

    if (
      approverError ||
      !selectedApprover ||
      !isEligibleApprover(selectedApprover as ApproverCandidate, memberId)
    ) {
      return NextResponse.json(
        { error: "선택한 승인자를 지정할 수 없습니다." },
        { status: 400 },
      );
    }

    const { data: holidays, error: holidayError } = await supabase
      .from("holidays")
      .select("holiday_date")
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate);

    if (holidayError) {
      return NextResponse.json(
        { error: "공휴일 확인에 실패했습니다." },
        { status: 500 },
      );
    }

    const holidaySet = new Set(
      (holidays || []).map((holiday) => holiday.holiday_date),
    );
    const dates: string[] = [];
    for (
      let current = new Date(`${startDate}T00:00:00Z`),
        last = new Date(`${endDate}T00:00:00Z`);
      current <= last;
      current.setUTCDate(current.getUTCDate() + 1)
    ) {
      const date = current.toISOString().slice(0, 10);
      const dayOfWeek = current.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(date))
        dates.push(date);
    }

    if (dates.length === 0) {
      return NextResponse.json(
        { error: "선택한 기간에 영업일이 없습니다." },
        { status: 400 },
      );
    }

    const { data: created, error: createError } = await supabase.rpc(
      "create_leave_request_atomic",
      {
        p_request_id: requestId,
        p_author_id: memberId,
        p_target_id: memberId,
        p_approver_id: selectedApproverId,
        p_dates: dates,
        p_leave_type_id: leaveTypeId,
        p_late_hour: null,
        p_late_minute: null,
        p_cc_member_ids: ccMemberIds,
        p_reason: reason || null,
        p_initial_status: "pending",
      },
    );

    if (createError || !created?.length) {
      console.error("Atomic leave request creation failed:", createError);
      return getRpcErrorResponse(createError?.message ?? "unknown");
    }

    return NextResponse.json(
      {
        request_id: requestId,
        dayoffs: created.map((row) => ({
          id: row.dayoff_id,
          leave_date: row.leave_date,
          approval_status: row.approval_status,
        })),
        approvals: created.map((row) => ({ id: row.approval_id })),
        approver_id: selectedApproverId,
        dates_count: created.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Leave request API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
