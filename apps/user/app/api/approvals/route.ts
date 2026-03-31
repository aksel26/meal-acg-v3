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

    let dayoffsMap: Record<string, unknown> = {};
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

    const result = (data || []).map((r) => ({
      ...r,
      related_data:
        r.related_table === "dayoffs" && r.related_id
          ? dayoffsMap[r.related_id] || null
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

    const { data: updated, error: updateError } = await supabase
      .from("approval_requests")
      .update({
        status: newStatus,
        reject_reason: action === "reject" ? rejectReason || null : null,
        resolved_at: new Date().toISOString(),
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

    // 관련 dayoff 상태 업데이트
    if (approvalData.related_table === "dayoffs" && approvalData.related_id) {
      const dayoffUpdate: Record<string, unknown> = {
        approval_status: newStatus,
      };

      if (action === "approve") {
        dayoffUpdate.approver_id = memberId;
        dayoffUpdate.approved_at = new Date().toISOString();
      }

      await supabase
        .from("dayoffs")
        .update(dayoffUpdate)
        .eq("id", approvalData.related_id);
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
