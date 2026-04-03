import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/early-leave-requests/:id - 승인 상태 변경
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
      action: "pre_approve" | "approve" | "reject" | "revert";
      rejectReason?: string;
    };

    const validActions = ["pre_approve", "approve", "reject", "revert"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: "action must be 'pre_approve', 'approve', 'reject', or 'revert'" },
        { status: 400 }
      );
    }

    // 현재 요청 조회
    const { data: req, error: fetchError } = await supabase
      .from("early_leave_requests")
      .select("*, attendance_record:attendance_records!early_leave_requests_attendance_record_id_fkey(id)")
      .eq("id", id)
      .single();

    if (fetchError || !req) {
      return NextResponse.json(
        { error: "Early leave request not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const updateFields: Record<string, unknown> = { updated_at: now };

    switch (action) {
      case "pre_approve":
        if (req.approval_status !== "pending") {
          return NextResponse.json(
            { error: "가승인은 대기 상태에서만 가능합니다." },
            { status: 400 }
          );
        }
        updateFields.approval_status = "pre_approved";
        updateFields.first_approver_id = session.userId;
        updateFields.first_approved_at = now;
        break;

      case "approve":
        if (req.approval_status !== "pre_approved") {
          return NextResponse.json(
            { error: "최종승인은 가승인 상태에서만 가능합니다." },
            { status: 400 }
          );
        }
        updateFields.approval_status = "approved";
        updateFields.final_approver_id = session.userId;
        updateFields.final_approved_at = now;
        break;

      case "reject":
        if (req.approval_status === "rejected") {
          return NextResponse.json(
            { error: "이미 반려된 요청입니다." },
            { status: 400 }
          );
        }
        updateFields.approval_status = "rejected";
        updateFields.reject_reason = rejectReason || null;
        break;

      case "revert":
        if (req.approval_status === "approved") {
          updateFields.approval_status = "pre_approved";
          updateFields.final_approver_id = null;
          updateFields.final_approved_at = null;
        } else if (req.approval_status === "pre_approved") {
          updateFields.approval_status = "pending";
          updateFields.first_approver_id = null;
          updateFields.first_approved_at = null;
        } else {
          return NextResponse.json(
            { error: "되돌릴 수 없는 상태입니다." },
            { status: 400 }
          );
        }
        break;
    }

    const { data: updated, error: updateError } = await supabase
      .from("early_leave_requests")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating early leave request:", updateError);
      return NextResponse.json(
        { error: "Failed to update early leave request" },
        { status: 500 }
      );
    }

    // 최종승인 시 attendance_records에도 반영
    if (action === "approve" && req.attendance_record?.id) {
      await supabase
        .from("attendance_records")
        .update({
          approver_id: session.userId,
          approved_at: now,
        })
        .eq("id", req.attendance_record.id);
    }

    // 최종승인 되돌리기 시 attendance_records 승인 정보 제거
    if (action === "revert" && req.approval_status === "approved" && req.attendance_record?.id) {
      await supabase
        .from("attendance_records")
        .update({
          approver_id: null,
          approved_at: null,
        })
        .eq("id", req.attendance_record.id);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Early leave request update API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
