import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getWorkerSession } from "@/lib/worker-session";

export async function GET(
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

    const { data, error } = await supabase
      .from("assignments")
      .select("attendance_status, worker:workers(name)")
      .eq("id", session.assignmentId)
      .eq("worker_id", session.workerId)
      .eq("job_posting_id", jobPostingId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "배정 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const worker = data.worker as unknown as { name: string } | null;
    return NextResponse.json(
      {
        attendance_status: data.attendance_status,
        worker_name: worker?.name || null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/attendance/[jobPostingId]/status error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
