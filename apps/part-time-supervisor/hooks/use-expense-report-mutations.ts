"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { ExpenseReportItem } from "./use-expense-reports";

export function useCreateExpenseReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      year: number;
      month: number;
      items?: ExpenseReportItem[];
      total_labor_cost?: number;
    }) => {
      const res = await fetch("/api/interview/expense-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interviewExpenseReports.all });
    },
  });
}

export function useUpdateExpenseReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      id: string;
      title?: string;
      items?: ExpenseReportItem[];
      status?: "draft" | "finalized";
    }) => {
      const { id, ...rest } = body;
      const res = await fetch(`/api/interview/expense-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interviewExpenseReports.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewExpenseReports.detail(variables.id),
      });
    },
  });
}

export function useDeleteExpenseReportById() {
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
