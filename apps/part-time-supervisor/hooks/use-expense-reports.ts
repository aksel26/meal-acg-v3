"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type ExpenseReportItem = { name: string; amount: number; note?: string };

export type ExpenseReport = {
  id: string;
  year: number;
  month: number;
  title: string;
  items: ExpenseReportItem[];
  total_labor_cost: number;
  total_extra_cost: number;
  grand_total: number;
  status: "draft" | "finalized";
  created_at: string;
  updated_at: string;
};

export function useExpenseReport(year: number, month: number) {
  return useQuery<ExpenseReport | null>({
    queryKey: queryKeys.interviewExpenseReports.byMonth(year, month),
    queryFn: async () => {
      const res = await fetch(`/api/interview/expense-reports?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

export function useSaveExpenseReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      year: number;
      month: number;
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
