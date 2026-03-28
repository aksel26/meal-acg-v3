import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = request.nextUrl;
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("interview_personnel")
      .select(`
        *,
        interview_job_assignments(
          job_posting_id,
          status,
          interview_job_postings(title, start_date)
        ),
        interview_work_records(id)
      `)
      .order("created_at", { ascending: false });

    if (role) query = query.eq("role", role);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    // 응답 형태 변환
    const result = (data ?? []).map((p: Record<string, unknown>) => {
      const assignments = (p.interview_job_assignments as Record<string, unknown>[] | null) ?? [];
      const workRecords = (p.interview_work_records as Record<string, unknown>[] | null) ?? [];

      return {
        ...p,
        assignments: assignments
          .filter((a) => a.status !== "cancelled")
          .map((a) => {
            const posting = a.interview_job_postings as Record<string, string> | null;
            return {
              job_posting_id: a.job_posting_id,
              job_posting_title: posting?.title ?? "",
              start_date: posting?.start_date ?? "",
              status: a.status,
            };
          })
          .sort((a, b) => b.start_date.localeCompare(a.start_date)),
        work_record_count: workRecords.length,
        interview_job_assignments: undefined,
        interview_work_records: undefined,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/interview/personnel error:", error);
    return NextResponse.json({ error: "Failed to fetch personnel" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("interview_personnel")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/interview/personnel error:", error);
    return NextResponse.json({ error: "Failed to create personnel" }, { status: 500 });
  }
}
