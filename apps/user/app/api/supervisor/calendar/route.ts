import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET /api/supervisor/calendar?year=YYYY&month=MM
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB 연결 실패" }, { status: 500 });
    }

    const yearParam = request.nextUrl.searchParams.get("year");
    const monthParam = request.nextUrl.searchParams.get("month");

    if (!yearParam || !monthParam) {
      return NextResponse.json(
        { error: "year, month 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const m = monthParam.padStart(2, "0");
    const monthStart = `${yearParam}-${m}-01`;
    const lastDay = new Date(parseInt(yearParam), parseInt(monthParam), 0).getDate();
    const monthEnd = `${yearParam}-${m}-${lastDay}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sv = supabase.schema("supervisor" as any) as any;

    // 감독관 공고
    const { data: jobPostings } = await sv
      .from("job_postings")
      .select("id, title, start_date, end_date, status")
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart);

    // 면접교육 공고
    const { data: interviewPostings } = await sv
      .from("interview_job_postings")
      .select("id, title, start_date, end_date, status")
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart);

    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jobPostings: (jobPostings || []).map((jp: any) => ({ ...jp, type: "supervisor" as const })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interviewPostings: (interviewPostings || []).map((ip: any) => ({ ...ip, type: "interview" as const })),
    });
  } catch (error) {
    console.error("Supervisor calendar API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
