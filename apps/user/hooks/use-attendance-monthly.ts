"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface AttendanceRecord {
  id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_status: string | null;
  check_out_status: string | null;
  attendance_type: string;
  status: string;
  overtime_minutes: number;
  is_weekend: boolean;
  work_minutes: number;
  modification_status: string | null;
  early_leave_reason: string | null;
}

export interface AttendanceSummary {
  total_work_days: number;
  total_work_minutes: number;
  total_overtime_minutes: number;
  early_check_in_count: number;
  late_count: number;
  early_leave_count: number;
}

interface AttendanceMonthlyResponse {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
}

export function useAttendanceMonthly(
  memberId: string | null,
  year: number,
  month: number,
) {
  return useQuery<AttendanceMonthlyResponse>({
    queryKey: queryKeys.attendance.monthly(memberId || "", year, month),
    queryFn: async () => {
      const params = new URLSearchParams({
        memberId: memberId!,
        year: String(year),
        month: String(month),
      });
      const res = await fetch(`/api/attendance/monthly?${params}`);
      if (!res.ok) throw new Error("월간 출퇴근 내역 조회 실패");
      return res.json();
    },
    enabled: !!memberId,
    staleTime: 60 * 1000,
  });
}
