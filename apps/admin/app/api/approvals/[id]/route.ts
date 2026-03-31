import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/approvals/:id - 승인 또는 반려 처리
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { action, rejectReason } = body as {
      action: "approve" | "reject";
      rejectReason?: string;
    };

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
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
        { status: 404 }
      );
    }

    if (request_data.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 요청입니다." },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // 승인 요청 상태 업데이트
    const { data: updated, error: updateError } = await supabase
      .from("approval_requests")
      .update({
        status: newStatus,
        reject_reason: action === "reject" ? rejectReason || null : null,
        resolved_at: new Date().toISOString(),
        resolved_by: session.userId,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating approval:", updateError);
      return NextResponse.json(
        { error: "Failed to update approval" },
        { status: 500 }
      );
    }

    // 관련 dayoff의 approval_status도 업데이트
    if (request_data.related_table === "dayoffs" && request_data.related_id) {
      const dayoffUpdate: Record<string, unknown> = {
        approval_status: newStatus,
      };

      if (action === "approve") {
        dayoffUpdate.approver_id = session.userId;
        dayoffUpdate.approved_at = new Date().toISOString();
      }

      await supabase
        .from("dayoffs")
        .update(dayoffUpdate)
        .eq("id", request_data.related_id);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approval update API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
