import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("interview_job_postings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Job posting not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/interview/job-postings/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job posting" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("interview_job_postings")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/interview/job-postings/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update job posting" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    // 활성 배정 확인
    const { data: activeAssignments } = await supabase
      .from("interview_job_assignments")
      .select("id")
      .eq("job_posting_id", id)
      .eq("status", "assigned")
      .limit(1);

    if (activeAssignments && activeAssignments.length > 0) {
      return NextResponse.json(
        { error: "활성 배정이 있는 공고는 삭제할 수 없습니다." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("interview_job_postings")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/interview/job-postings/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete job posting" },
      { status: 500 },
    );
  }
}
