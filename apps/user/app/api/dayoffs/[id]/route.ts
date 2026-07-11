import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

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

// PUT /api/dayoffs/[id] - 근태 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 수정자는 로그인 세션 본인으로 강제하고, 본인 소유 근태만 수정 허용
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      leaveDate,
      leaveTypeId,
      lateHour,
      lateMinute,
      approverId,
      ccMemberIds,
      reason,
      editReason,
    } = body;

    const editorId = sessionUser.id;

    const { data: existing } = await supabase
      .from("dayoffs")
      .select("approver_id, author_id, target_id")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "근태를 찾을 수 없습니다." }, { status: 404 });
    }

    if (
      existing.author_id !== sessionUser.id &&
      existing.target_id !== sessionUser.id
    ) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (existing.approver_id && !editReason?.trim()) {
      return NextResponse.json(
        { error: "승인된 근태 수정 시 수정 사유가 필요합니다." },
        { status: 400 }
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
    if (approverId !== undefined) {
      updateData.approver_id = approverId || null;
      updateData.approved_at = approverId ? new Date().toISOString() : null;
    }
    if (ccMemberIds !== undefined) updateData.cc_member_ids = ccMemberIds;
    if (reason !== undefined) updateData.reason = reason;
    if (editReason !== undefined) updateData.edit_reason = editReason || null;

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

// DELETE /api/dayoffs/[id] - 근태 소프트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 본인 소유 근태만 삭제 허용
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

    const { id } = await params;

    const { data: existing } = await supabase
      .from("dayoffs")
      .select("author_id, target_id")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "근태를 찾을 수 없습니다." }, { status: 404 });
    }

    if (
      existing.author_id !== sessionUser.id &&
      existing.target_id !== sessionUser.id
    ) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
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
