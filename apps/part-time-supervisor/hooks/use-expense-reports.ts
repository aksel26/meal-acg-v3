"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type ExpenseReportItem = { name: string; amount: number; note?: string };

export type ExpenseReport = {
  id: string;
  job_posting_id?: string | null;
  year?: number | null;
  month?: number | null;
  title: string;
  items: ExpenseReportItem[];
  total_labor_cost: number;
  total_extra_cost: number;
  grand_total: number;
  status: "draft" | "finalized";
  created_at: string;
  updated_at: string;
};

// 단일 job_posting_id 기반 조회 (기존 ExpenseReportDialog에서 사용)
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

// year/month 기반 목록 조회
export function useExpenseReports(year: number, month: number) {
  return useQuery<ExpenseReport[]>({
    queryKey: [...queryKeys.interviewExpenseReports.all, year, month],
    queryFn: async () => {
      const res = await fetch(`/api/interview/expense-reports?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

// 상세 조회 by id
export function useExpenseReportDetail(id: string | null) {
  return useQuery<ExpenseReport>({
    queryKey: queryKeys.interviewExpenseReports.detail(id!),
    queryFn: async () => {
      const res = await fetch(`/api/interview/expense-reports/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!id,
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
