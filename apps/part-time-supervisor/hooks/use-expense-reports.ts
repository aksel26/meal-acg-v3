"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type ExpenseReportItem = { name: string; amount: number; note?: string };

export type ExpenseReport = {
  id: string;
  job_posting_id: string;
  title: string;
  items: ExpenseReportItem[];
  total_labor_cost: number;
  total_extra_cost: number;
  grand_total: number;
  status: "draft" | "finalized";
  created_at: string;
  updated_at: string;
};

export function useExpenseReport(jobPostingId: string) {
  return useQuery<ExpenseReport | null>({
    queryKey: queryKeys.interviewExpenseReports.byJobPosting(jobPostingId),
    queryFn: async () => {
      const res = await fetch(`/api/interview/expense-reports?job_posting_id=${jobPostingId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!jobPostingId,
  });
}

export function useSaveExpenseReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      job_posting_id: string;
      title: string;
      items: ExpenseReportItem[];
      status?: string;
    }) => {
      const res = await fetch("/api/interview/expense-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interviewExpenseReports.all });
    },
  });
}

export function useDeleteExpenseReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/interview/expense-reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interviewExpenseReports.all });
    },
  });
}
