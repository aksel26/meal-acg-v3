import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateAmount, calculateDefaultWorkHours } from "@/lib/cost-utils";

function parseTime(time: string): number {
  const parts = time.split(":").map(Number);
  return (parts[0] ?? 0) + (parts[1] ?? 0) / 60;
}

function calculateEstimatedCost(
  payRate: number | null,
  payType: string | null,
  workStart: string | null,
  workEnd: string | null,
  lunchStart: string | null,
  lunchEnd: string | null,
  assigned: number
): number {
  if (!payRate || !payType) return 0;

  if (payType === "daily") {
    return payRate * assigned;
  }

  // hourly
  if (!workStart || !workEnd) return 0;
  let workHours = parseTime(workEnd) - parseTime(workStart);
  if (lunchStart && lunchEnd) {
    workHours -= parseTime(lunchEnd) - parseTime(lunchStart);
  }
  return payRate * Math.max(workHours, 0) * assigned;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: jobPostings, error } = await supabase
      .from("job_postings")
      .select(
        `id, title, location, platform, work_type, start_date, end_date, work_start, work_end, status, headcount, pay_rate, pay_type, lunch_start, lunch_end,
        assignments(id, attendance_status, contract_status, room_slots, status, worker:workers(id, name, phone))`
      )
      .in("status", ["draft", "open", "in_progress"])
      .lte("start_date", endDate)
      .gte("end_date", startDate);

    if (error) {
      console.error("Dashboard query error:", error);
      return NextResponse.json(
        { error: "Failed to load dashboard" },
        { status: 500 }
      );
    }

    let totalAssigned = 0;
    let totalAttendanceCompleted = 0;
    let totalContractCompleted = 0;
    let totalEstimatedCost = 0;

    const mappedJobPostings = (jobPostings ?? []).map((jp) => {
      // Filter out cancelled assignments (LEFT JOIN returns all)
      const activeAssignments = (jp.assignments ?? []).filter(
        (a: Record<string, unknown>) => a.status !== "cancelled"
      );

      const assigned = activeAssignments.length;

      let attendanceCheckedIn = 0;
      let attendanceConfirmed = 0;
      let contractSigned = 0;
      let contractConfirmed = 0;
      let notAttended = 0;
      let notContracted = 0;

      for (const a of activeAssignments) {
        const rec = a as Record<string, unknown>;
        if (rec.attendance_status === "checked_in") attendanceCheckedIn++;
        if (rec.attendance_status === "confirmed") attendanceConfirmed++;
        if (rec.contract_status === "signed") contractSigned++;
        if (rec.contract_status === "confirmed") contractConfirmed++;
        if (rec.attendance_status === null) notAttended++;
        if (rec.contract_status === null) notContracted++;
      }

      const hasIssues =
        assigned > 0 &&
        (notAttended / assigned >= 0.5 || notContracted / assigned >= 0.5);

      const estimatedCost = calculateEstimatedCost(
        jp.pay_rate,
        jp.pay_type,
        jp.work_start,
        jp.work_end,
        jp.lunch_start,
        jp.lunch_end,
        assigned
      );

      totalAssigned += assigned;
      totalAttendanceCompleted += attendanceCheckedIn + attendanceConfirmed;
      totalContractCompleted += contractSigned + contractConfirmed;
      totalEstimatedCost += estimatedCost;

      const workers = activeAssignments.map((a: Record<string, unknown>) => {
        const worker = a.worker as Record<string, unknown> | null;
        return {
          id: a.id,
          workerId: worker?.id ?? null,
          name: worker?.name ?? null,
          phone: worker?.phone ?? null,
          attendanceStatus: a.attendance_status,
          contractStatus: a.contract_status,
          roomSlots: a.room_slots,
        };
      });

      return {
        id: jp.id,
        title: jp.title,
        location: jp.location,
        platform: jp.platform,
        workType: jp.work_type,
        startDate: jp.start_date,
        endDate: jp.end_date,
        workStart: jp.work_start,
        workEnd: jp.work_end,
        status: jp.status,
        headcount: jp.headcount,
        payRate: jp.pay_rate,
        payType: jp.pay_type,
        estimatedCost,
        workers,
        stats: {
          assigned,
          attendanceCheckedIn,
          attendanceConfirmed,
          contractSigned,
          contractConfirmed,
        },
        hasIssues,
      };
    });

    // ── 면접교육 데이터 ──
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0]!;

    const [activePersonnelRes, interviewRecordsRes, interviewPersonnelRes, expenseReportRes, interviewJobPostingsRes] = await Promise.all([
      supabase
        .from("interview_personnel")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("interview_work_records")
        .select("*, personnel:interview_personnel(id, role, pay_type, default_pay_rate)")
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd),
      supabase
        .from("interview_personnel")
        .select("id, role, contract_amount")
        .eq("status", "active"),
      supabase
        .from("interview_expense_reports")
        .select("status")
        .eq("year", currentYear)
        .eq("month", currentMonth)
        .maybeSingle(),
      supabase
        .from("interview_job_postings")
        .select(`
          id, title, platform, start_date, end_date, work_start, work_end, status,
          total_headcount, pay_rate, pay_type,
          interview_job_assignments(id, pay_type, pay_rate, work_hours, status, note,
            personnel:interview_personnel(id, name, role, phone))
        `)
        .in("status", ["draft", "open"])
        .lte("start_date", endDate)
        .gte("end_date", startDate),
    ]);

    // Calculate interview labor cost
    let interviewLaborCost = 0;

    for (const p of interviewPersonnelRes.data ?? []) {
      if (p.role !== "rp") {
        interviewLaborCost += p.contract_amount ?? 0;
      }
    }

    for (const r of interviewRecordsRes.data ?? []) {
      if (r.work_hours > 0 && r.personnel) {
        const p = r.personnel as { id: string; role: string; pay_type: string; default_pay_rate: number | null };
        if (p.role === "rp") {
          const rate = r.pay_rate_override ?? p.default_pay_rate ?? 0;
          const type = (r.pay_type_override ?? p.pay_type) as "hourly" | "daily";
          interviewLaborCost += calculateAmount(type, rate, r.work_hours);
        }
      }
    }

    // ── 면접교육 공고를 jobPostings에 통합 ──
    const interviewJobPostings = (interviewJobPostingsRes.data ?? []).map((jp) => {
      const activeAssignments = (jp.interview_job_assignments ?? []).filter(
        (a: Record<string, unknown>) => a.status !== "cancelled"
      );

      return {
        type: "interview" as const,
        id: jp.id,
        title: jp.title,
        startDate: jp.start_date,
        endDate: jp.end_date,
        platform: jp.platform,
        assignments: activeAssignments.map((a: Record<string, unknown>) => {
          const p = a.personnel as Record<string, unknown> | null;
          return {
            id: a.id,
            name: (p?.name as string) ?? "-",
            role: (p?.role as string) ?? "other",
            payType: a.pay_type as string,
            payRate: a.pay_rate as number,
            workHours: a.work_hours as number | null,
            status: a.status as string,
          };
        }),
      };
    });

    // ── 면접교육 공고 통계 ──
    let interviewTotalAssigned = 0;
    let interviewEstimatedCost = 0;

    for (const jp of interviewJobPostingsRes.data ?? []) {
      const activeAssignments = (jp.interview_job_assignments ?? []).filter(
        (a: Record<string, unknown>) => a.status !== "cancelled"
      );
      interviewTotalAssigned += activeAssignments.length;

      for (const a of activeAssignments) {
        const rec = a as Record<string, unknown>;
        const payType = rec.pay_type as "hourly" | "daily";
        const payRate = rec.pay_rate as number;
        const workHours = rec.work_hours as number | null;

        if (payType === "daily") {
          interviewEstimatedCost += payRate;
        } else {
          const hours = workHours ?? calculateDefaultWorkHours(
            jp.work_start, jp.work_end, null, null
          );
          interviewEstimatedCost += payRate * hours;
        }
      }
    }

    return NextResponse.json({
      summary: {
        activeJobCount: mappedJobPostings.length,
        totalAssigned,
        attendanceCompleted: totalAttendanceCompleted,
        contractCompleted: totalContractCompleted,
        totalEstimatedCost,
      },
      jobPostings: [
        ...mappedJobPostings.map((jp) => ({ ...jp, type: "supervisor" as const })),
        ...interviewJobPostings,
      ],
      interview: {
        activePersonnel: activePersonnelRes.count ?? 0,
        monthlyLaborCost: interviewLaborCost,
        expenseReportStatus: expenseReportRes.data?.status ?? null,
        activeJobCount: interviewJobPostings.length,
        totalAssigned: interviewTotalAssigned,
        totalEstimatedCost: interviewEstimatedCost,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
