import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobPostingId: string }> }
) {
  try {
    const { jobPostingId } = await params;
    const { assignment_id, worker_id } = await request.json();

    if (!assignment_id || !worker_id) {
      return NextResponse.json(
        { error: "assignment_id와 worker_id가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // assignment 확인: 해당 공고 + 지원자 매칭
    const { data: assignment, error: fetchError } = await supabase
      .from("assignments")
      .select("id, attendance_status")
      .eq("id", assignment_id)
      .eq("worker_id", worker_id)
      .eq("job_posting_id", jobPostingId)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json(
        { error: "배정 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (assignment.attendance_status) {
      return NextResponse.json(
        { error: "이미 출석 처리되었습니다.", attendance_status: assignment.attendance_status },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from("assignments")
      .update({
        attendance_status: "checked_in",
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", assignment_id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, attendance_status: "checked_in" });
  } catch (error) {
    console.error("POST /api/attendance/[jobPostingId]/check-in error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
