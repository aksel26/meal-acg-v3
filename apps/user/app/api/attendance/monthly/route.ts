import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getSessionUser } from "@/lib/auth";

dayjs.extend(utc);
dayjs.extend(timezone);

// GET /api/attendance/monthly?year=2026&month=4
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = sessionUser.id;
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json(
        { error: "year, month는 필수입니다." },
        { status: 400 },
      );
    }

    const startDate = dayjs
      .tz(`${year}-${month.padStart(2, "0")}-01`, "Asia/Seoul")
      .format("YYYY-MM-DD");
    const endDate = dayjs
      .tz(`${year}-${month.padStart(2, "0")}-01`, "Asia/Seoul")
      .endOf("month")
      .format("YYYY-MM-DD");

    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("member_id", memberId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error fetching monthly attendance:", error);
      return NextResponse.json(
        { error: "월간 출퇴근 내역 조회 실패" },
        { status: 500 },
      );
    }

    const recordIds = (records || []).map((r) => r.id);
    let modificationMap: Record<string, string> = {};
    let earlyLeaveReasonMap: Record<string, string> = {};

    if (recordIds.length > 0) {
      const [{ data: modifications }, { data: earlyLeaveRequests }] =
        await Promise.all([
          supabase
            .from("attendance_modification_requests")
            .select("attendance_record_id, approval_status")
            .in("attendance_record_id", recordIds)
            .neq("approval_status", "반려"),
          supabase
            .from("early_leave_requests")
            .select("attendance_record_id, reason")
            .in("attendance_record_id", recordIds),
        ]);

      if (modifications) {
        modificationMap = Object.fromEntries(
          modifications.map((m) => [m.attendance_record_id, m.approval_status]),
        );
      }
      if (earlyLeaveRequests) {
        earlyLeaveReasonMap = Object.fromEntries(
          earlyLeaveRequests.map((request) => [
            request.attendance_record_id,
            request.reason,
          ]),
        );
      }
    }

    const enrichedRecords = (records || []).map((r) => {
      let workMinutes = 0;
      if (r.check_in_at && r.check_out_at) {
        workMinutes = Math.floor(
          (new Date(r.check_out_at).getTime() -
            new Date(r.check_in_at).getTime()) /
            60000,
        );
      }

      return {
        id: r.id,
        date: r.date,
        check_in_at: r.check_in_at,
        check_out_at: r.check_out_at,
        check_in_status: r.check_in_status,
        check_out_status: r.check_out_status,
        attendance_type: r.attendance_type ?? "근무",
        status: r.status,
        overtime_minutes: r.overtime_minutes ?? 0,
        is_weekend: r.is_weekend ?? false,
        work_minutes: workMinutes,
        modification_status: modificationMap[r.id] ?? null,
        early_leave_reason: earlyLeaveReasonMap[r.id] ?? null,
      };
    });

    const workRecords = enrichedRecords.filter((r) => Boolean(r.check_in_at));
    const summary = {
      total_work_days: workRecords.length,
      total_work_minutes: workRecords.reduce(
        (sum, r) => sum + r.work_minutes,
        0,
      ),
      total_overtime_minutes: workRecords.reduce(
        (sum, r) => sum + r.overtime_minutes,
        0,
      ),
      early_check_in_count: workRecords.filter(
        (r) => (r.check_in_status ?? r.status) === "early_check_in",
      ).length,
      late_count: workRecords.filter(
        (r) => (r.check_in_status ?? r.status) === "late",
      ).length,
      early_leave_count: workRecords.filter(
        (r) => (r.check_out_status ?? r.status) === "early_leave",
      ).length,
    };

    return NextResponse.json({ records: enrichedRecords, summary });
  } catch (error) {
    console.error("Monthly attendance API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
