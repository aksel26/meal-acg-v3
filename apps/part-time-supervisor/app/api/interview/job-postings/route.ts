import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const supabase = createServiceClient();

    const { data: postings, error } = await supabase
      .from("interview_job_postings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 각 공고별 배정 인원수 조회
    const ids = (postings ?? []).map((p) => p.id);
    let assignmentCounts: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: counts, error: countError } = await supabase
        .from("interview_job_assignments")
        .select("job_posting_id")
        .in("job_posting_id", ids)
        .neq("status", "cancelled");

      if (countError) throw countError;

      assignmentCounts = (counts ?? []).reduce(
        (acc, row) => {
          acc[row.job_posting_id] = (acc[row.job_posting_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
    }

    const result = (postings ?? []).map((p) => ({
      ...p,
      assignment_count: assignmentCounts[p.id] || 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/interview/job-postings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job postings" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("interview_job_postings")
      .insert({ ...body, created_by: session.id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/interview/job-postings error:", error);
    return NextResponse.json(
      { error: "Failed to create job posting" },
      { status: 500 },
    );
  }
}
