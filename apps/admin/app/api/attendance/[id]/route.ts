import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/attendance/[id] - 관리자 출퇴근 기록 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { check_in_at, check_out_at, status, overtime_minutes, note } = body;

    const updateData: Record<string, unknown> = {};
    if (check_in_at !== undefined) updateData.check_in_at = check_in_at;
    if (check_out_at !== undefined) updateData.check_out_at = check_out_at;
    if (status !== undefined) updateData.status = status;
    if (overtime_minutes !== undefined) updateData.overtime_minutes = overtime_minutes;
    if (note !== undefined) updateData.note = note;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "수정할 필드가 없습니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating attendance record:", error);
      return NextResponse.json(
        { error: "출퇴근 기록 수정 실패", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Attendance [id] API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
