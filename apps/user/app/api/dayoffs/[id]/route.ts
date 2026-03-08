import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET /api/dayoffs/[id] - 근태 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
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
      `
      )
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch dayoff" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT /api/dayoffs/[id] - 근태 수정 (승인된 건은 수정 불가)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { editorId, leaveDate, leaveTypeId, lateHour, lateMinute, ccMemberIds, reason } = body;

    if (!editorId) {
      return NextResponse.json(
        { error: "editorId is required" },
        { status: 400 }
      );
    }

    // 승인 여부 확인 (승인된 건은 일반 사용자 수정 불가)
    const { data: existing } = await supabase
      .from("dayoffs")
      .select("approver_id")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (existing?.approver_id) {
      return NextResponse.json(
        { error: "승인된 근태는 수정할 수 없습니다." },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {
      last_editor_id: editorId,
    };

    if (leaveDate !== undefined) updateData.leave_date = leaveDate;
    if (leaveTypeId !== undefined) {
      updateData.leave_type_id = leaveTypeId;
      updateData.late_hour = leaveTypeId === 1 ? (lateHour || null) : null;
      updateData.late_minute = leaveTypeId === 1 ? (lateMinute || null) : null;
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/dayoffs/[id] - 근태 소프트 삭제 (승인된 건은 삭제 불가)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

    const { id } = await params;

    // 승인 여부 확인
    const { data: existing } = await supabase
      .from("dayoffs")
      .select("approver_id")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (existing?.approver_id) {
      return NextResponse.json(
        { error: "승인된 근태는 삭제할 수 없습니다." },
        { status: 403 }
      );
    }

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
