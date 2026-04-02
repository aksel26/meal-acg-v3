"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface SupervisorJobPosting {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
  headcount: number;
  work_type: string | null;
  platform: string | null;
  assigned_count: number;
  type: "supervisor";
}

export interface InterviewJobPosting {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  total_headcount: number;
  platform: string | null;
  type: "interview";
}

export interface SupervisorWorker {
  id: string;
  name: string;
  phone: string;
  assignment_status: string;
  job_title: string;
}

export interface SupervisorCalendarData {
  jobPostings: SupervisorJobPosting[];
  interviewPostings: InterviewJobPosting[];
  workers: SupervisorWorker[];
}

export function useSupervisorCalendar(date: string) {
  return useQuery<SupervisorCalendarData>({
    queryKey: queryKeys.supervisor.calendar(date),
    queryFn: async () => {
      const res = await fetch(`/api/supervisor/calendar?date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch supervisor calendar");
      return res.json();
    },
    enabled: !!date,
    staleTime: 60 * 1000,
  });
}

export function useSupervisorCalendarByMonth(year: number, month: number) {
  return useQuery<SupervisorCalendarData>({
    queryKey: ["supervisor", "calendar-month", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/supervisor/calendar?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch supervisor calendar");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
