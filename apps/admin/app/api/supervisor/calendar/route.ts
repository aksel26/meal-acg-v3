import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/supervisor/calendar?date=YYYY-MM-DD  or  ?year=YYYY&month=MM
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const date = request.nextUrl.searchParams.get("date");
    const yearParam = request.nextUrl.searchParams.get("year");
    const monthParam = request.nextUrl.searchParams.get("month");

    if (!date && !(yearParam && monthParam)) {
      return NextResponse.json(
        { error: "date 또는 year+month 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    // 해당 날짜/월 범위에 겹치는 공고 조회
    let query = supabase
      .schema("supervisor")
      .from("job_postings")
      .select("id, title, location, start_date, end_date, status, headcount, work_type, platform");

    if (date) {
      query = query.lte("start_date", date).gte("end_date", date);
    } else {
      const m = monthParam!.padStart(2, "0");
      const monthStart = `${yearParam}-${m}-01`;
      const lastDay = new Date(parseInt(yearParam!), parseInt(monthParam!), 0).getDate();
      const monthEnd = `${yearParam}-${m}-${lastDay}`;
      // 공고 기간이 해당 월과 겹치는 경우: start_date <= monthEnd AND end_date >= monthStart
      query = query.lte("start_date", monthEnd).gte("end_date", monthStart);
    }

    const { data: jobPostings, error: jpError } = await query;

    if (jpError) {
      console.error("Error fetching job postings:", jpError);
      return NextResponse.json(
        { error: "공고 조회 실패" },
        { status: 500 }
      );
    }

    // 해당 공고들에 배정된 감독관(worker) 조회
    const jobPostingIds = (jobPostings || []).map((jp) => jp.id);
    let workers: Array<{
      id: string;
      worker_id: string;
      status: string;
      job_posting_id: string;
      worker: { id: string; name: string; phone: string } | null;
      job_posting: { title: string } | null;
    }> = [];

    if (jobPostingIds.length > 0) {
      const { data: assignments, error: aError } = await supabase
        .schema("supervisor")
        .from("assignments")
        .select("id, worker_id, status, job_posting_id, worker:workers!assignments_worker_id_fkey(id, name, phone), job_posting:job_postings!assignments_job_posting_id_fkey(title)")
        .in("job_posting_id", jobPostingIds)
        .neq("status", "cancelled");

      if (aError) {
        console.error("Error fetching assignments:", aError);
      } else {
        workers = (assignments || []) as unknown as typeof workers;
      }
    }

    // 공고별 배정 수 집계
    const assignedCountMap = new Map<string, number>();
    for (const w of workers) {
      const count = assignedCountMap.get(w.job_posting_id) || 0;
      assignedCountMap.set(w.job_posting_id, count + 1);
    }

    // 면접교육(interview) 공고 조회
    let interviewQuery = supabase
      .schema("supervisor")
      .from("interview_job_postings")
      .select("id, title, start_date, end_date, status, total_headcount, platform");

    if (date) {
      interviewQuery = interviewQuery.lte("start_date", date).gte("end_date", date);
    } else {
      const m2 = monthParam!.padStart(2, "0");
      const mStart = `${yearParam}-${m2}-01`;
      const lastDay2 = new Date(parseInt(yearParam!), parseInt(monthParam!), 0).getDate();
      const mEnd = `${yearParam}-${m2}-${lastDay2}`;
      interviewQuery = interviewQuery.lte("start_date", mEnd).gte("end_date", mStart);
    }

    const { data: interviewPostings, error: ipError } = await interviewQuery;
    if (ipError) {
      console.error("Error fetching interview postings:", ipError);
    }

    return NextResponse.json({
      jobPostings: (jobPostings || []).map((jp) => ({
        ...jp,
        type: "supervisor" as const,
        assigned_count: assignedCountMap.get(jp.id) || 0,
      })),
      interviewPostings: (interviewPostings || []).map((ip) => ({
        ...ip,
        type: "interview" as const,
      })),
      workers: workers.map((w) => ({
        id: w.worker?.id || w.worker_id,
        name: w.worker?.name || "-",
        phone: w.worker?.phone || "-",
        assignment_status: w.status,
        job_title: w.job_posting?.title || "-",
      })),
    });
  } catch (error) {
    console.error("Supervisor calendar API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
