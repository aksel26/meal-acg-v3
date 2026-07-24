import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

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

// GET /api/approvals - 내가 승인할 요청 목록 (세션 본인 기준)
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const memberId = sessionUser.id;
    const status = searchParams.get("status");

    let query = supabase
      .from("approval_requests")
      .select(
        `
        *,
        requester:members!approval_requests_requester_id_fkey(id, full_name)
      `,
      )
      .eq("approver_id", memberId)
      .order("requested_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching approvals:", error);
      return NextResponse.json(
        { error: "승인 목록 조회 실패" },
        { status: 500 },
      );
    }

    // 관련 dayoff 정보 조회
    const dayoffIds = (data || [])
      .filter((r) => r.related_table === "dayoffs" && r.related_id)
      .map((r) => r.related_id!);
    const attendanceModifyIds = (data || [])
      .filter(
        (r) =>
          r.related_table === "attendance_modification_requests" &&
          r.related_id,
      )
      .map((r) => r.related_id!);
    const workApplicationIds = (data || [])
      .filter((r) => r.related_table === "work_applications" && r.related_id)
      .map((r) => r.related_id!);

    // 서로 독립적인 세 관련 데이터 조회를 병렬 실행 (빈 목록은 즉시 resolve)
    const [dayoffsResult, modifyRequestsResult, workApplicationsResult] =
      await Promise.all([
        dayoffIds.length > 0
          ? supabase
              .from("dayoffs")
              .select(
                `
          *,
          target:members!dayoffs_target_id_fkey(id, full_name),
          leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category),
          first_approver:members!dayoffs_first_approver_id_fkey(id, full_name),
          final_approver:members!dayoffs_final_approver_id_fkey(id, full_name)
        `,
              )
              .in("id", dayoffIds)
          : Promise.resolve({ data: null }),
        attendanceModifyIds.length > 0
          ? supabase
              .from("attendance_modification_requests")
              .select(
                `
          *,
          requester:members!attendance_modification_requests_requester_id_fkey(id, full_name),
          attendance_record:attendance_records!attendance_modification_requests_attendance_record_id_fkey(
            id, member_id, date, attendance_type, check_in_at, check_out_at
          )
        `,
              )
              .in("id", attendanceModifyIds)
          : Promise.resolve({ data: null }),
        workApplicationIds.length > 0
          ? supabase
              .from("work_applications")
              .select("*")
              .in("id", workApplicationIds)
          : Promise.resolve({ data: null }),
      ]);

    const dayoffsMap: Record<string, unknown> = dayoffsResult.data
      ? Object.fromEntries(dayoffsResult.data.map((d) => [d.id, d]))
      : {};
    const attendanceModifyMap: Record<string, unknown> =
      modifyRequestsResult.data
        ? Object.fromEntries(
            modifyRequestsResult.data.map((modifyRequest) => [
              modifyRequest.id,
              modifyRequest,
            ]),
          )
        : {};
    const workApplicationsMap: Record<string, unknown> =
      workApplicationsResult.data
        ? Object.fromEntries(
            workApplicationsResult.data.map((application) => [
              application.id,
              application,
            ]),
          )
        : {};

    const result = (data || []).map((r) => ({
      ...r,
      related_data:
        r.related_table === "dayoffs" && r.related_id
          ? dayoffsMap[r.related_id] || null
          : r.related_table === "attendance_modification_requests" &&
              r.related_id
            ? attendanceModifyMap[r.related_id] || null
            : r.related_table === "work_applications" && r.related_id
              ? workApplicationsMap[r.related_id] || null
              : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Approvals API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// PUT /api/approvals - 승인/반려 처리
export async function PUT(request: NextRequest) {
  try {
    // 결재자는 로그인 세션 본인으로 강제한다 (body의 memberId 위조 차단)
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
    const { approvalId, action, rejectReason } = body as {
      approvalId: string;
      action: "approve" | "reject";
      rejectReason?: string;
    };
    const memberId = sessionUser.id;

    if (!approvalId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "유효한 approvalId와 action이 필요합니다." },
        { status: 400 },
      );
    }

    // 승인 요청 조회 + 권한 확인 (approver_id === 세션 사용자)
    const { data: approvalData, error: fetchError } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("id", approvalId)
      .eq("approver_id", memberId)
      .single();

    if (fetchError || !approvalData) {
      return NextResponse.json(
        { error: "승인 요청을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 },
      );
    }

    if (approvalData.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 요청입니다." },
        { status: 400 },
      );
    }

    const normalizedRejectReason =
      typeof rejectReason === "string" ? rejectReason.trim() : "";

    if (
      action === "reject" &&
      (approvalData.related_table === "attendance_modification_requests" ||
        approvalData.related_table === "work_applications") &&
      !normalizedRejectReason
    ) {
      return NextResponse.json(
        { error: "반려 사유를 입력해주세요." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // 휴가와 결재 요청은 DB 트랜잭션에서 함께 갱신한다.
    // user 앱은 1차 가승인만 담당한다: action="approve" → RPC p_action="pre_approve".
    if (approvalData.related_table === "dayoffs" && approvalData.related_id) {
      const rpcAction = action === "approve" ? "pre_approve" : "reject";

      const { data: resolved, error: resolveError } = await supabase
        .rpc("resolve_leave_approval_atomic", {
          p_approval_id: approvalData.id,
          p_actor_id: memberId,
          p_action: rpcAction,
          p_require_assigned_approver: true,
          p_reject_reason: normalizedRejectReason || null,
        })
        .single();

      if (resolveError) {
        console.error("Atomic leave approval failed:", resolveError);
        const { message, status } = mapLeaveApprovalError(resolveError.message);
        return NextResponse.json({ error: message }, { status });
      }

      return NextResponse.json(resolved);
    }

    if (
      approvalData.related_table === "attendance_modification_requests" &&
      approvalData.related_id
    ) {
      const { data: modifyRequest, error: modifyFetchError } = await supabase
        .from("attendance_modification_requests")
        .select("*")
        .eq("id", approvalData.related_id)
        .single();

      if (modifyFetchError || !modifyRequest) {
        return NextResponse.json(
          { error: "근태 수정 요청을 찾을 수 없습니다." },
          { status: 404 },
        );
      }

      if (action === "approve") {
        const { error: attendanceError } = await supabase
          .from("attendance_records")
          .update({
            attendance_type: modifyRequest.requested_type,
            modifier_id: modifyRequest.requester_id,
            approver_id: memberId,
            approved_at: now,
            updated_at: now,
          })
          .eq("id", modifyRequest.attendance_record_id);

        if (attendanceError) {
          console.error(
            "Error applying attendance modify request:",
            attendanceError,
          );
          return NextResponse.json(
            { error: "근태 수정 요청 반영 실패" },
            { status: 500 },
          );
        }
      }

      const { error: modifyUpdateError } = await supabase
        .from("attendance_modification_requests")
        .update({
          approval_status: action === "approve" ? "승인" : "반려",
          first_approver_id: memberId,
          first_approved_at: now,
          final_approver_id: memberId,
          final_approved_at: now,
          reject_reason: action === "reject" ? normalizedRejectReason : null,
          updated_at: now,
        })
        .eq("id", approvalData.related_id);

      if (modifyUpdateError) {
        console.error(
          "Error updating attendance modify request:",
          modifyUpdateError,
        );
        return NextResponse.json(
          { error: "근태 수정 결재 상태 반영 실패" },
          { status: 500 },
        );
      }
    }

    if (
      approvalData.related_table === "work_applications" &&
      approvalData.related_id
    ) {
      const { error: workApplicationUpdateError } = await supabase
        .rpc("resolve_work_application_approval", {
          p_approval_id: approvalData.id,
          p_approver_id: memberId,
          p_action: action,
          p_reject_reason: normalizedRejectReason || undefined,
        })
        .single();

      if (workApplicationUpdateError) {
        console.error(
          "Error updating work application approval:",
          workApplicationUpdateError,
        );
        return NextResponse.json(
          { error: "근무 신청 결재 상태 반영 실패" },
          { status: 500 },
        );
      }

      const { data: resolvedApproval } = await supabase
        .from("approval_requests")
        .select()
        .eq("id", approvalData.id)
        .single();

      return NextResponse.json(resolvedApproval);
    }

    const { data: updated, error: updateError } = await supabase
      .from("approval_requests")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reject_reason:
          action === "reject" ? normalizedRejectReason || null : null,
        resolved_at: now,
        resolved_by: memberId,
      })
      .eq("id", approvalId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating approval:", updateError);
      return NextResponse.json({ error: "승인 처리 실패" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approval update API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
