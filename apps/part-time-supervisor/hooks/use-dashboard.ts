"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { RoomSlot } from "@/lib/room-constants";

export type DashboardWorker = {
  id: string;
  workerId: string | null;
  name: string | null;
  phone: string | null;
  attendanceStatus: string | null;
  contractStatus: string | null;
  roomSlots: RoomSlot[] | null;
};

export type DashboardSupervisorJobPosting = {
  type: "supervisor";
  id: string;
  title: string;
  location: string | null;
  platform: string | null;
  workType: string | null;
  startDate: string;
  endDate: string;
  workStart: string | null;
  workEnd: string | null;
  status: string;
  headcount: number;
  workers: DashboardWorker[];
  stats: {
    assigned: number;
    attendanceCheckedIn: number;
    attendanceConfirmed: number;
    contractSigned: number;
    contractConfirmed: number;
  };
  payRate: number;
  payType: "hourly" | "daily";
  estimatedCost: number;
  hasIssues: boolean;
};

export type InterviewAssignmentRow = {
  id: string;
  name: string;
  role: string;
  payType: string;
  payRate: number;
  workHours: number | null;
  status: string;
};

export type DashboardInterviewJobPosting = {
  type: "interview";
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  platform: string | null;
  assignments: InterviewAssignmentRow[];
};

export type DashboardJobPosting =
  | DashboardSupervisorJobPosting
  | DashboardInterviewJobPosting;

export type DashboardData = {
  summary: {
    activeJobCount: number;
    totalAssigned: number;
    attendanceCompleted: number;
    contractCompleted: number;
    totalEstimatedCost: number;
  };
  jobPostings: DashboardJobPosting[];
  interview?: {
    activePersonnel: number;
    monthlyLaborCost: number;
    expenseReportStatus: string | null;
    activeJobCount: number;
    totalAssigned: number;
    totalEstimatedCost: number;
  };
};

export function useDashboard(startDate: string, endDate: string) {
  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard.byDateRange(startDate, endDate),
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard?start_date=${startDate}&end_date=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });
}
