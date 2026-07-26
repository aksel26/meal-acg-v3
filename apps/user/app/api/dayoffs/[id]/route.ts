import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const APPROVER_ROLES = new Set(["대표", "본부장", "팀장", "파트장"]);
const APPROVER_AUTHORITIES = new Set(["관리자", "팀장", "팀장/본부장"]);

function rpcErrorResponse(message: string) {
  if (message.includes("LEAVE_BALANCE_NOT_FOUND")) {
    return NextResponse.json(
      { error: "연차 잔액 정보를 확인할 수 없습니다." },
      { status: 400 },
    );
  }
  if (message.includes("FORBIDDEN")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (message.includes("NOT_FOUND")) {
    return NextResponse.json(
      { error: "근태를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (message.includes("DUPLICATE_DATE")) {
    return NextResponse.json(
      { error: "해당 날짜에 이미 신청했거나 승인된 휴가가 있습니다." },
      { status: 409 },
    );
  }
  if (message.includes("EDIT_REASON_REQUIRED")) {
    return NextResponse.json(
      { error: "승인된 근태 수정 시 수정 사유가 필요합니다." },
      { status: 400 },
    );
  }
  if (message.includes("LEAVE_INVALID_APPROVER")) {
    return NextResponse.json(
      { error: "선택한 승인자를 지정할 수 없습니다." },
      { status: 400 },
    );
  }
  if (
    message.includes("LEAVE_REQUEST_INVALID_DATE") ||
    message.includes("LEAVE_REQUEST_INVALID_TYPE")
  ) {
    return NextResponse.json(
      { error: "수정할 휴가 날짜 또는 유형이 유효하지 않습니다." },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { error: "근태 처리에 실패했습니다." },
    { status: 500 },
  );
}

// GET /api/dayoffs/[id] - 본인, 지정 승인자 또는 참조자만 상세 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const { data, error } = await supabase
      .from("dayoffs")
      .select(
        `
        *,
        author:members!dayoffs_author_id_fkey(id, full_name),
        target:members!dayoffs_target_id_fkey(id, full_name),
        approver:members!dayoffs_approver_id_fkey(id, full_name),
        leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category, duration_type)
      `,
      )
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "근태를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { data: assignedApproval } = await supabase
      .from("approval_requests")
      .select("id, approver_id")
      .eq("related_table", "dayoffs")
      .eq("related_id", id)
      .limit(1)
      .maybeSingle();

    const canRead =
      data.author_id === sessionUser.id ||
      data.target_id === sessionUser.id ||
      data.approver_id === sessionUser.id ||
      data.cc_member_ids?.includes(sessionUser.id) ||
      assignedApproval?.approver_id === sessionUser.id ||
      sessionUser.role === "admin" ||
      sessionUser.role === "team_lead";

    if (!canRead) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    return NextResponse.json({
      ...data,
      requested_approver_id:
        assignedApproval?.approver_id ?? data.approver_id ?? null,
    });
  } catch (error) {
    console.error("Dayoffs detail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/dayoffs/[id] - 소유자가 수정하며 결재/연차는 DB에서 동기화
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();
    const allowedKeys = [
      "leaveDate",
      "leaveTypeId",
      "lateHour",
      "lateMinute",
      "approverId",
      "ccMemberIds",
      "reason",
      "editReason",
    ];
    const changes = Object.fromEntries(
      allowedKeys.filter((key) => key in body).map((key) => [key, body[key]]),
    );

    if (Object.keys(changes).length === 0) {
      return NextResponse.json(
        { error: "변경할 값이 없습니다." },
        { status: 400 },
      );
    }
    if (typeof changes.reason === "string" && changes.reason.length > 2000) {
      return NextResponse.json(
        { error: "사유는 2,000자 이내여야 합니다." },
        { status: 400 },
      );
    }
    if (
      "approverId" in changes &&
      (typeof changes.approverId !== "string" ||
        !UUID_PATTERN.test(changes.approverId))
    ) {
      return NextResponse.json(
        { error: "유효하지 않은 승인자입니다." },
        { status: 400 },
      );
    }
    if (typeof changes.approverId === "string") {
      const [{ data: requester }, { data: approver }] = await Promise.all([
        supabase
          .from("members")
          .select("organization_id")
          .eq("id", sessionUser.id)
          .single(),
        supabase
          .from("members")
          .select("id, organization_id, member_role, user_authority")
          .eq("id", changes.approverId)
          .single(),
      ]);
      if (
        !requester?.organization_id ||
        !approver ||
        approver.id === sessionUser.id ||
        approver.organization_id !== requester.organization_id ||
        (!APPROVER_ROLES.has(approver.member_role ?? "") &&
          !APPROVER_AUTHORITIES.has(approver.user_authority ?? ""))
      ) {
        return NextResponse.json(
          { error: "선택한 승인자를 지정할 수 없습니다." },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabase
      .rpc("update_dayoff_atomic", {
        p_dayoff_id: id,
        p_editor_id: sessionUser.id,
        p_is_admin: false,
        p_changes: changes,
      })
      .single();

    if (error) {
      console.error("Atomic dayoff update failed:", error);
      return rpcErrorResponse(error.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs update API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/dayoffs/[id] - 휴가와 연결 결재를 원자적으로 소프트 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const { error } = await supabase.rpc("delete_dayoff_atomic", {
      p_dayoff_id: id,
      p_actor_id: sessionUser.id,
      p_is_admin: false,
    });

    if (error) {
      console.error("Atomic dayoff delete failed:", error);
      return rpcErrorResponse(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dayoffs delete API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
