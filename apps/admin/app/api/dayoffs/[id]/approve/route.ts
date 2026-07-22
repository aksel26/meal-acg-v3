import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// PATCH /api/dayoffs/[id]/approve - 공식 결재 요청과 휴가를 함께 승인/취소
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("leave:approve");
    const supabase = createServiceClient();
    const { id } = await params;
    const { action } = await request.json();

    if (!action || !["approve", "cancel"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'cancel'" },
        { status: 400 },
      );
    }

    const expectedStatus = action === "approve" ? "pending" : "approved";
    const { data: approval, error: approvalError } = await supabase
      .from("approval_requests")
      .select("id")
      .eq("related_table", "dayoffs")
      .eq("related_id", id)
      .eq("status", expectedStatus)
      .order("requested_at", { ascending: false })
      .limit(1)
      .single();

    if (approvalError || !approval) {
      return NextResponse.json(
        { error: "처리할 휴가 결재 요청을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { error: resolveError } = await supabase
      .rpc("resolve_leave_approval_atomic", {
        p_approval_id: approval.id,
        p_actor_id: session.userId,
        p_action: action,
        p_require_assigned_approver: false,
        p_reject_reason: null,
      })
      .single();

    if (resolveError) {
      console.error("Atomic admin dayoff approval failed:", resolveError);
      return NextResponse.json(
        { error: "Failed to update approval status" },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("dayoffs")
      .select(
        `
        *,
        approver:members!dayoffs_approver_id_fkey(id, full_name)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch dayoff" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs approve API error:", error);
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
