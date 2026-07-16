import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncWorkerStatus } from "@/lib/worker-status";
import {
  buildWorkerSessionLogoutCookie,
  getWorkerSession,
} from "@/lib/worker-session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobPostingId: string }> },
) {
  try {
    const { jobPostingId } = await params;
    const session = await getWorkerSession(request, jobPostingId);
    if (!session) {
      return NextResponse.json(
        { error: "본인 확인이 만료되었습니다." },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();

    // assignment 확인: 해당 공고 + 지원자 매칭
    const { data: assignment, error: fetchError } = await supabase
      .from("assignments")
      .select("id, attendance_status")
      .eq("id", session.assignmentId)
      .eq("worker_id", session.workerId)
      .eq("job_posting_id", jobPostingId)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json(
        { error: "배정 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (assignment.attendance_status) {
      return NextResponse.json(
        {
          error: "이미 출석 처리되었습니다.",
          attendance_status: assignment.attendance_status,
        },
        { status: 409 },
      );
    }

    const { error: updateError } = await supabase
      .from("assignments")
      .update({
        attendance_status: "checked_in",
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", session.assignmentId)
      .eq("worker_id", session.workerId)
      .is("attendance_status", null);

    if (updateError) throw updateError;

    await syncWorkerStatus(supabase, session.workerId);

    const response = NextResponse.json({
      success: true,
      attendance_status: "checked_in",
    });
    response.cookies.set(buildWorkerSessionLogoutCookie());
    return response;
  } catch (error) {
    console.error("POST /api/attendance/[jobPostingId]/check-in error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
