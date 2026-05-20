"use client";

import { useQuery } from "@tanstack/react-query";
import type { DayoffRecord } from "@/hooks/use-dayoffs";
import type { SupervisorPosting } from "@/hooks/use-supervisor-calendar";
import type { RequestPriority, RequestStatus } from "@/lib/requests";
import type { ProjectStatus } from "@/lib/projects";

export interface DashboardAttendanceRecord {
  id: string;
  date: string;
  attendance_type: string;
  status: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  modification_status?: { approval_status: string }[] | null;
}

export interface DashboardDueRequest {
  id: string;
  title: string;
  status: RequestStatus;
  priority: RequestPriority;
  due_date: string | null;
  created_at: string;
}

export interface DashboardProjectSchedule {
  id: string;
  title: string;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
}

export interface DashboardCalendarData {
  attendanceRecords: DashboardAttendanceRecord[];
  dayoffs: DayoffRecord[];
  postings: SupervisorPosting[];
  requests: DashboardDueRequest[];
  projects: DashboardProjectSchedule[];
}

export function useDashboardCalendar(year: number, month: number) {
  return useQuery<DashboardCalendarData>({
    queryKey: ["dashboard", "calendar", year, month],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      const response = await fetch(`/api/dashboard/calendar?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "대시보드 캘린더 정보를 불러오지 못했습니다.");
      }

      return data;
    },
    staleTime: 60 * 1000,
  });
}
