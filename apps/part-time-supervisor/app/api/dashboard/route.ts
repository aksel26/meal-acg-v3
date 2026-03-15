import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

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
        `id, title, location, start_date, end_date, work_start, work_end, status, headcount, pay_rate, pay_type, lunch_start, lunch_end,
        assignments(id, attendance_status, contract_status, room_slots, status, worker:workers(id, name, phone))`
      )
      .in("status", ["open", "in_progress"])
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

    return NextResponse.json({
      summary: {
        activeJobCount: mappedJobPostings.length,
        totalAssigned,
        attendanceCompleted: totalAttendanceCompleted,
        contractCompleted: totalContractCompleted,
        totalEstimatedCost,
      },
      jobPostings: mappedJobPostings,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
