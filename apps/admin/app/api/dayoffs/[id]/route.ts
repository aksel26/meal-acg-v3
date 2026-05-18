import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/dayoffs/[id] - 근태 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from("dayoffs")
      .select(
        `
        *,
        author:members!dayoffs_author_id_fkey(id, full_name),
        target:members!dayoffs_target_id_fkey(id, full_name),
        approver:members!dayoffs_approver_id_fkey(id, full_name),
        last_editor:members!dayoffs_last_editor_id_fkey(id, full_name),
        leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category, duration_type)
      `
      )
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (error) {
      console.error("Error fetching dayoff:", error);
      return NextResponse.json(
        { error: "Failed to fetch dayoff" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/dayoffs/[id] - 근태 수정 (관리자는 항상 수정 가능)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { leaveDate, leaveTypeId, lateHour, lateMinute, approverId, ccMemberIds, reason } =
      body;

    const updateData: Record<string, unknown> = {
      last_editor_id: session.userId,
    };

    if (leaveDate !== undefined) updateData.leave_date = leaveDate;
    if (leaveTypeId !== undefined) {
      updateData.leave_type_id = leaveTypeId;
      updateData.late_hour = leaveTypeId === 1 ? (lateHour || null) : null;
      updateData.late_minute = leaveTypeId === 1 ? (lateMinute || null) : null;
    }
    if (approverId !== undefined) {
      updateData.approver_id = approverId || null;
      updateData.approved_at = approverId ? new Date().toISOString() : null;
    }
    if (ccMemberIds !== undefined) updateData.cc_member_ids = ccMemberIds;
    if (reason !== undefined) updateData.reason = reason;

    const { data, error } = await supabase
      .from("dayoffs")
      .update(updateData)
      .eq("id", id)
      .eq("is_deleted", false)
      .select()
      .single();

    if (error) {
      console.error("Error updating dayoff:", error);
      return NextResponse.json(
        { error: "Failed to update dayoff" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/dayoffs/[id] - 근태 소프트 삭제 (관리자는 항상 삭제 가능)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    const { error } = await supabase
      .from("dayoffs")
      .update({ is_deleted: true })
      .eq("id", id)
      .eq("is_deleted", false);

    if (error) {
      console.error("Error deleting dayoff:", error);
      return NextResponse.json(
        { error: "Failed to delete dayoff" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dayoffs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
