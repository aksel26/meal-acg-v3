import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET /api/approvals?memberId=xxx - 내가 승인할 요청 목록
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const status = searchParams.get("status");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId가 필요합니다." },
        { status: 400 }
      );
    }

    let query = supabase
      .from("approval_requests")
      .select(
        `
        *,
        requester:members!approval_requests_requester_id_fkey(id, full_name)
      `
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
        { status: 500 }
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

    let dayoffsMap: Record<string, unknown> = {};
    let attendanceModifyMap: Record<string, unknown> = {};
    let workApplicationsMap: Record<string, unknown> = {};
    if (dayoffIds.length > 0) {
      const { data: dayoffs } = await supabase
        .from("dayoffs")
        .select(
          `
          *,
          target:members!dayoffs_target_id_fkey(id, full_name),
          leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category)
        `
        )
        .in("id", dayoffIds);

      if (dayoffs) {
        dayoffsMap = Object.fromEntries(dayoffs.map((d) => [d.id, d]));
      }
    }

    if (attendanceModifyIds.length > 0) {
      const { data: modifyRequests } = await supabase
        .from("attendance_modification_requests")
        .select(
          `
          *,
          requester:members!attendance_modification_requests_requester_id_fkey(id, full_name),
          attendance_record:attendance_records!attendance_modification_requests_attendance_record_id_fkey(
            id, member_id, date, attendance_type, check_in_at, check_out_at
          )
        `
        )
        .in("id", attendanceModifyIds);

      if (modifyRequests) {
        attendanceModifyMap = Object.fromEntries(
          modifyRequests.map((modifyRequest) => [modifyRequest.id, modifyRequest]),
        );
      }
    }

    if (workApplicationIds.length > 0) {
      const { data: workApplications } = await supabase
        .from("work_applications")
        .select("*")
        .in("id", workApplicationIds);

      if (workApplications) {
        workApplicationsMap = Object.fromEntries(
          workApplications.map((application) => [application.id, application]),
        );
      }
    }

    const result = (data || []).map((r) => ({
      ...r,
      related_data:
        r.related_table === "dayoffs" && r.related_id
          ? dayoffsMap[r.related_id] || null
          : r.related_table === "attendance_modification_requests" && r.related_id
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
      { status: 500 }
    );
  }
}

// PUT /api/approvals - 승인/반려 처리
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { approvalId, memberId, action, rejectReason } = body as {
      approvalId: string;
      memberId: string;
      action: "approve" | "reject";
      rejectReason?: string;
    };

    if (!approvalId || !memberId || !action) {
      return NextResponse.json(
        { error: "approvalId, memberId, action은 필수입니다." },
        { status: 400 }
      );
    }

    // 승인 요청 조회 + 권한 확인
    const { data: approvalData, error: fetchError } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("id", approvalId)
      .eq("approver_id", memberId)
      .single();

    if (fetchError || !approvalData) {
      return NextResponse.json(
        { error: "승인 요청을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    if (approvalData.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 요청입니다." },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const normalizedRejectReason =
      typeof rejectReason === "string" ? rejectReason.trim() : "";

    if (
      action === "reject" &&
      approvalData.related_table === "attendance_modification_requests" &&
      !normalizedRejectReason
    ) {
      return NextResponse.json(
        { error: "반려 사유를 입력해주세요." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 관련 dayoff 상태 업데이트
    if (approvalData.related_table === "dayoffs" && approvalData.related_id) {
      const dayoffUpdate: Record<string, unknown> = {
        approval_status: newStatus,
      };

      if (action === "approve") {
        dayoffUpdate.approver_id = memberId;
        dayoffUpdate.approved_at = now;
      }

      const { error: dayoffUpdateError } = await supabase
        .from("dayoffs")
        .update(dayoffUpdate)
        .eq("id", approvalData.related_id);

      if (dayoffUpdateError) {
        console.error("Error updating dayoff approval:", dayoffUpdateError);
        return NextResponse.json(
          { error: "휴가 결재 상태 반영 실패" },
          { status: 500 }
        );
      }
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
          { status: 404 }
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
          console.error("Error applying attendance modify request:", attendanceError);
          return NextResponse.json(
            { error: "근태 수정 요청 반영 실패" },
            { status: 500 }
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
        console.error("Error updating attendance modify request:", modifyUpdateError);
        return NextResponse.json(
          { error: "근태 수정 결재 상태 반영 실패" },
          { status: 500 }
        );
      }
    }

    if (
      approvalData.related_table === "work_applications" &&
      approvalData.related_id
    ) {
      const { error: workApplicationUpdateError } = await supabase
        .from("work_applications")
        .update({
          status: newStatus,
          approved_at: action === "approve" ? now : null,
          reject_reason: action === "reject" ? normalizedRejectReason || null : null,
        })
        .eq("id", approvalData.related_id);

      if (workApplicationUpdateError) {
        console.error("Error updating work application approval:", workApplicationUpdateError);
        return NextResponse.json(
          { error: "근무 신청 결재 상태 반영 실패" },
          { status: 500 }
        );
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("approval_requests")
      .update({
        status: newStatus,
        reject_reason: action === "reject" ? normalizedRejectReason || null : null,
        resolved_at: now,
        resolved_by: memberId,
      })
      .eq("id", approvalId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating approval:", updateError);
      return NextResponse.json(
        { error: "승인 처리 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approval update API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
