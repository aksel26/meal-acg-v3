import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PATCH /api/dayoffs/[id]/approve - 근태 승인/승인취소
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();
    const { action } = body; // 'approve' | 'cancel'

    if (!action || !["approve", "cancel"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'cancel'" },
        { status: 400 }
      );
    }

    const updateData =
      action === "approve"
        ? { approver_id: session.userId, approved_at: new Date().toISOString() }
        : { approver_id: null, approved_at: null };

    const { data, error } = await supabase
      .from("dayoffs")
      .update(updateData)
      .eq("id", id)
      .eq("is_deleted", false)
      .select(
        `
        *,
        approver:members!dayoffs_approver_id_fkey(id, full_name)
      `
      )
      .single();

    if (error) {
      console.error("Error approving dayoff:", error);
      return NextResponse.json(
        { error: "Failed to update approval status" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs approve API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
