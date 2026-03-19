"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type CostPostingDetail = {
  jobPostingId: string;
  jobPostingTitle: string;
  assignmentId: string;
  startDate: string;
  endDate: string;
  payType: "hourly" | "daily";
  effectivePayRate: number;
  isOverridden: boolean;
  workDays: number;
  totalHours: number;
  subtotal: number;
};

export type CostWorkerData = {
  workerId: string;
  workerName: string;
  totalAmount: number;
  totalWorkDays: number;
  totalWorkHours: number;
  postingCount: number;
  postings: CostPostingDetail[];
};

export type CostManagementData = {
  summary: {
    totalAmount: number;
    totalWorkers: number;
    totalWorkHours: number;
    totalWorkDays: number;
  };
  workers: CostWorkerData[];
};

export function useCostManagement(
  year: number,
  month: number,
  search?: string
) {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  if (search) params.set("search", search);

  return useQuery<CostManagementData>({
    queryKey: [...queryKeys.costManagement.byMonth(year, month), search],
    queryFn: async () => {
      const res = await fetch(`/api/cost-management?${params}`);
      if (!res.ok) throw new Error("Failed to fetch cost data");
      return res.json();
    },
  });
}
