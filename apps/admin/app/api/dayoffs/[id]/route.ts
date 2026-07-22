import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/dayoffs/[id] - 근태 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      `,
      )
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (error) {
      console.error("Error fetching dayoff:", error);
      return NextResponse.json(
        { error: "Failed to fetch dayoff" },
        { status: 404 },
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
      { status: 500 },
    );
  }
}

// PUT /api/dayoffs/[id] - 근태 수정 (관리자는 항상 수정 가능)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const allowedKeys = [
      "leaveDate",
      "leaveTypeId",
      "lateHour",
      "lateMinute",
      "approverId",
      "ccMemberIds",
      "reason",
      "editReason",
    ];
    const changes = Object.fromEntries(
      allowedKeys.filter((key) => key in body).map((key) => [key, body[key]]),
    );

    if (Object.keys(changes).length === 0) {
      return NextResponse.json(
        { error: "변경할 값이 없습니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .rpc("update_dayoff_atomic", {
        p_dayoff_id: id,
        p_editor_id: session.userId,
        p_is_admin: true,
        p_changes: changes,
      })
      .single();

    if (error) {
      console.error("Atomic admin dayoff update failed:", error);
      const isDuplicate = error.message.includes("DUPLICATE_DATE");
      const isInvalidChange = error.message.includes(
        "LEAVE_APPROVER_CHANGE_FORBIDDEN",
      );
      return NextResponse.json(
        {
          error: isDuplicate
            ? "해당 날짜에 이미 신청했거나 승인된 휴가가 있습니다."
            : isInvalidChange
              ? "승인 완료된 휴가의 승인자는 변경할 수 없습니다."
              : "Failed to update dayoff",
        },
        { status: isDuplicate ? 409 : isInvalidChange ? 400 : 500 },
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
      { status: 500 },
    );
  }
}

// DELETE /api/dayoffs/[id] - 근태 소프트 삭제 (관리자는 항상 삭제 가능)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    const { error } = await supabase.rpc("delete_dayoff_atomic", {
      p_dayoff_id: id,
      p_actor_id: session.userId,
      p_is_admin: true,
    });

    if (error) {
      console.error("Atomic admin dayoff delete failed:", error);
      return NextResponse.json(
        { error: "Failed to delete dayoff" },
        { status: 500 },
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
      { status: 500 },
    );
  }
}
