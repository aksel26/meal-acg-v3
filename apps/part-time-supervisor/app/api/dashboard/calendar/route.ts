import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = request.nextUrl;
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json(
        { error: "year and month are required" },
        { status: 400 }
      );
    }

    const monthStart = `${year}-${month.padStart(2, "0")}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const monthEnd = `${year}-${month.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const supabase = createServiceClient();

    const [supervisorRes, interviewRes] = await Promise.all([
      supabase
        .from("job_postings")
        .select("id, title, platform, start_date, end_date, status")
        .in("status", ["draft", "open", "in_progress"])
        .lte("start_date", monthEnd)
        .gte("end_date", monthStart),
      supabase
        .from("interview_job_postings")
        .select("id, title, platform, start_date, end_date, status")
        .in("status", ["draft", "open"])
        .lte("start_date", monthEnd)
        .gte("end_date", monthStart),
    ]);

    if (supervisorRes.error || interviewRes.error) {
      console.error("Calendar query error:", supervisorRes.error ?? interviewRes.error);
      return NextResponse.json(
        { error: "Failed to load calendar data" },
        { status: 500 }
      );
    }

    const jobPostings = [
      ...(supervisorRes.data ?? []).map((jp) => ({
        id: jp.id,
        title: jp.title,
        platform: jp.platform,
        startDate: jp.start_date,
        endDate: jp.end_date,
        status: jp.status,
        type: "supervisor" as const,
      })),
      ...(interviewRes.data ?? []).map((jp) => ({
        id: jp.id,
        title: jp.title,
        platform: jp.platform,
        startDate: jp.start_date,
        endDate: jp.end_date,
        status: jp.status,
        type: "interview" as const,
      })),
    ];

    return NextResponse.json({ jobPostings });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to load calendar data" },
      { status: 500 }
    );
  }
}
