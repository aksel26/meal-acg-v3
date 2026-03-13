import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobPostingId: string }> }
) {
  try {
    const { jobPostingId } = await params;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignment_id");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignment_id가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("assignments")
      .select("attendance_status, worker:workers(name)")
      .eq("id", assignmentId)
      .eq("job_posting_id", jobPostingId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "배정 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const worker = data.worker as unknown as { name: string } | null;
    return NextResponse.json({
      attendance_status: data.attendance_status,
      worker_name: worker?.name || null,
    });
  } catch (error) {
    console.error("GET /api/attendance/[jobPostingId]/status error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
