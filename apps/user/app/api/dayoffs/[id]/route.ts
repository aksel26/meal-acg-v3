import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";

function rpcErrorResponse(message: string) {
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

    let canRead =
      data.author_id === sessionUser.id ||
      data.target_id === sessionUser.id ||
      data.approver_id === sessionUser.id ||
      data.cc_member_ids?.includes(sessionUser.id) ||
      sessionUser.role === "admin" ||
      sessionUser.role === "team_lead";

    if (!canRead) {
      const { data: assignedApproval } = await supabase
        .from("approval_requests")
        .select("id")
        .eq("related_table", "dayoffs")
        .eq("related_id", id)
        .eq("approver_id", sessionUser.id)
        .limit(1)
        .maybeSingle();
      canRead = Boolean(assignedApproval);
    }

    if (!canRead) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    return NextResponse.json(data);
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
