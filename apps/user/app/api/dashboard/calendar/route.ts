import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import { createWorkClient } from "@/lib/supabase/client-work";
import { APPROVED_LEAVE_STATUSES } from "utils/leave-status";

function getMonthRange(year: string, month: string) {
  const paddedMonth = month.padStart(2, "0");
  const lastDay = new Date(Number(year), Number(month), 0).getDate();

  return {
    startDate: `${year}-${paddedMonth}-01`,
    endDate: `${year}-${paddedMonth}-${lastDay}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const year = request.nextUrl.searchParams.get("year");
    const month = request.nextUrl.searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json(
        { error: "year, month 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB 연결 실패" }, { status: 500 });
    }

    const workClient = createWorkClient();
    const { startDate, endDate } = getMonthRange(year, month);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supervisor = supabase.schema("supervisor" as any) as any;

    const [
      { data: attendanceRecords, error: attendanceError },
      { data: dayoffs, error: dayoffsError },
      { data: jobPostings, error: jobPostingsError },
      { data: interviewPostings, error: interviewPostingsError },
      { data: requests, error: requestsError },
      { data: projects, error: projectsError },
    ] = await Promise.all([
      supabase
        .from("attendance_records")
        .select("id, date, attendance_type, status, check_in_at, check_out_at")
        .eq("member_id", session.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true }),
      supabase
        .from("dayoffs")
        .select(
          `
          id,
          author_id,
          target_id,
          leave_date,
          leave_type_id,
          late_hour,
          late_minute,
          cc_member_ids,
          reason,
          edit_reason,
          approver_id,
          approved_at,
          last_editor_id,
          is_deleted,
          created_at,
          updated_at,
          author:members!dayoffs_author_id_fkey(id, full_name),
          target:members!dayoffs_target_id_fkey(id, full_name),
          approver:members!dayoffs_approver_id_fkey(id, full_name),
          leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category, duration_type)
        `,
        )
        .eq("is_deleted", false)
        .in("approval_status", [...APPROVED_LEAVE_STATUSES])
        .eq("target_id", session.id)
        .gte("leave_date", startDate)
        .lte("leave_date", endDate)
        .order("leave_date", { ascending: true }),
      supervisor
        .from("job_postings")
        .select(
          "id, title, start_date, end_date, status, supervisor_id, created_by",
        )
        .lte("start_date", endDate)
        .gte("end_date", startDate)
        .or(`supervisor_id.eq.${session.id},created_by.eq.${session.id}`),
      supervisor
        .from("interview_job_postings")
        .select("id, title, start_date, end_date, status, created_by")
        .lte("start_date", endDate)
        .gte("end_date", startDate)
        .eq("created_by", session.id),
      workClient
        .from("requests")
        .select("id, title, status, priority, due_date, created_at")
        .gte("due_date", startDate)
        .lte("due_date", endDate)
        .or(
          `requester_id.eq.${session.id},assignee_id.eq.${session.id},assignee_ids.cs.{${session.id}}`,
        )
        .order("due_date", { ascending: true }),
      (() => {
        let query = workClient
          .from("projects")
          .select("id, title, status, start_date, due_date, created_at")
          .gte("due_date", startDate)
          .lte("due_date", endDate)
          .order("due_date", { ascending: true });

        if (session.role !== "admin" && session.role !== "team_lead") {
          query = query.or(
            `created_by.eq.${session.id},owner_id.eq.${session.id},manager_ids.cs.{${session.id}},stakeholder_ids.cs.{${session.id}}`,
          );
        }

        return query;
      })(),
    ]);

    const error =
      attendanceError ||
      dayoffsError ||
      jobPostingsError ||
      interviewPostingsError ||
      requestsError ||
      projectsError;

    if (error) {
      console.error("Dashboard calendar API error:", error);
      return NextResponse.json(
        { error: "대시보드 캘린더 정보를 불러오지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      attendanceRecords: attendanceRecords ?? [],
      dayoffs: dayoffs ?? [],
      postings: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(jobPostings ?? []).map((posting: any) => ({
          ...posting,
          type: "supervisor" as const,
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(interviewPostings ?? []).map((posting: any) => ({
          ...posting,
          type: "interview" as const,
        })),
      ],
      requests: requests ?? [],
      projects: projects ?? [],
    });
  } catch (error) {
    console.error("Dashboard calendar API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
