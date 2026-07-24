import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  requireAdminPermission,
  getAuthErrorStatus,
} from "@/lib/auth";

// resolve_leave_approval_atomic 예외명 → 사용자 메시지/HTTP status 매핑
// (supabase/migrations/20260724130001_leave_two_step_approval_rpc.sql 기준)
function mapLeaveApprovalError(message: string): {
  message: string;
  status: number;
} {
  if (message.includes("LEAVE_SAME_APPROVER_FORBIDDEN")) {
    return {
      message: "1차 가승인자와 동일한 사람은 최종승인할 수 없습니다.",
      status: 403,
    };
  }
  if (message.includes("FORBIDDEN")) {
    return { message: "승인 권한이 없습니다.", status: 403 };
  }
  if (message.includes("LEAVE_INVALID_TRANSITION")) {
    return {
      message: "이미 처리되었거나 처리할 수 없는 상태의 요청입니다.",
      status: 409,
    };
  }
  if (message.includes("NOT_RESOLVED")) {
    return {
      message: "처리 완료된 요청만 취소할 수 있습니다.",
      status: 409,
    };
  }
  if (message.includes("NOT_FOUND")) {
    return { message: "요청을 찾을 수 없습니다.", status: 404 };
  }
  return { message: "휴가 결재 상태 반영 실패", status: 500 };
}

// PUT /api/approvals/:id - 승인, 반려, 처리 취소
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { action, rejectReason } = body as {
      action: "pre_approve" | "approve" | "reject" | "cancel" | "revert";
      rejectReason?: string;
    };

    const validActions = ["pre_approve", "approve", "reject", "cancel", "revert"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        {
          error:
            "action must be 'pre_approve', 'approve', 'reject', 'cancel', or 'revert'",
        },
        { status: 400 },
      );
    }

    // 현재 승인 요청 조회
    const { data: request_data, error: fetchError } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !request_data) {
      return NextResponse.json(
        { error: "Approval request not found" },
        { status: 404 },
      );
    }

    if (request_data.related_table === "work_applications") {
      await requireAdminPermission("attendance:write");
    } else {
      await requireAdminPermission("leave:approve");
    }

    // pre_approve/revert는 2단계 승인(휴가)에만 존재하는 전이
    if (
      (action === "pre_approve" || action === "revert") &&
      request_data.related_table !== "dayoffs"
    ) {
      return NextResponse.json(
        { error: "가승인/가승인 취소는 휴가 요청에서만 가능합니다." },
        { status: 400 },
      );
    }

    if (
      action === "cancel" &&
      !["approved", "rejected"].includes(request_data.status)
    ) {
      return NextResponse.json(
        { error: "승인 또는 반려 완료된 요청만 취소할 수 있습니다." },
        { status: 400 },
      );
    }

    // dayoffs는 RPC(resolve_leave_approval_atomic)가 상태 전이를 자체 검증하므로
    // (pending→pre_approved→approved 2단계) 여기서는 pending 단일 게이트를 적용하지 않는다.
    if (
      action !== "cancel" &&
      request_data.related_table !== "dayoffs" &&
      request_data.status !== "pending"
    ) {
      return NextResponse.json(
        { error: "이미 처리된 요청입니다." },
        { status: 400 },
      );
    }

    const normalizedRejectReason =
      typeof rejectReason === "string" ? rejectReason.trim() : "";

    if (
      request_data.related_table === "work_applications" &&
      request_data.related_id
    ) {
      if (action === "reject" && !normalizedRejectReason) {
        return NextResponse.json(
          { error: "반려 사유를 입력해주세요." },
          { status: 400 },
        );
      }

      const rpcResult =
        action === "cancel"
          ? await supabase
              .rpc("set_work_application_approval_status", {
                p_application_id: request_data.related_id,
                p_status: "pending",
                p_resolved_by: session.userId,
              })
              .single()
          : await supabase
              .rpc("resolve_work_application_approval", {
                p_approval_id: request_data.id,
                p_approver_id: request_data.approver_id,
                p_action: action,
                p_reject_reason: normalizedRejectReason || undefined,
                p_resolved_by: session.userId,
              })
              .single();

      if (rpcResult.error) {
        console.error(
          "Admin work application approval error:",
          rpcResult.error,
        );
        return NextResponse.json(
          { error: "근무 신청 결재 상태 반영 실패" },
          { status: 500 },
        );
      }

      const { data: resolvedApproval, error: resolvedApprovalError } =
        await supabase
          .from("approval_requests")
          .select()
          .eq("id", request_data.id)
          .single();

      if (resolvedApprovalError) {
        return NextResponse.json(
          { error: "처리된 승인 요청 조회 실패" },
          { status: 500 },
        );
      }

      return NextResponse.json(resolvedApproval);
    }

    if (request_data.related_table === "dayoffs" && request_data.related_id) {
      // 하위호환: 기존 단일 "approve" 버튼이 대기 상태 건에 대해 호출되면 1차 가승인으로 처리.
      // (Task 8에서 명시적 pre_approve/approve 버튼으로 분기해도 그대로 동작)
      const rpcAction =
        action === "approve" && request_data.status === "pending"
          ? "pre_approve"
          : action;

      const { data: resolvedApproval, error: resolveError } = await supabase
        .rpc("resolve_leave_approval_atomic", {
          p_approval_id: request_data.id,
          p_actor_id: session.userId,
          p_action: rpcAction,
          p_require_assigned_approver: false,
          p_reject_reason: normalizedRejectReason || null,
        })
        .single();

      if (resolveError) {
        console.error("Admin atomic leave approval error:", resolveError);
        const { message, status } = mapLeaveApprovalError(resolveError.message);
        return NextResponse.json({ error: message }, { status });
      }

      return NextResponse.json(resolvedApproval);
    }

    const newStatus =
      action === "approve"
        ? "approved"
        : action === "reject"
          ? "rejected"
          : "pending";

    // 승인 요청 상태 업데이트
    const { data: updated, error: updateError } = await supabase
      .from("approval_requests")
      .update({
        status: newStatus,
        reject_reason: action === "reject" ? rejectReason || null : null,
        resolved_at: action === "cancel" ? null : new Date().toISOString(),
        resolved_by: action === "cancel" ? null : session.userId,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating approval:", updateError);
      return NextResponse.json(
        { error: "Failed to update approval" },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approval update API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
