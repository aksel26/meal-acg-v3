"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

// ── Create Allocation ──

export function useCreateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      member_id: string;
      allocation_type: string;
      period: string;
      total_amount: number;
      description?: string;
    }) => {
      const res = await fetch("/api/budget-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create allocation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgetAllocations.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      toast.success("예산이 할당되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "예산 할당에 실패했습니다.");
    },
  });
}

// ── Update Allocation ──

export function useUpdateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      total_amount,
      description,
    }: {
      id: string;
      total_amount: number;
      description?: string;
    }) => {
      const res = await fetch(`/api/budget-allocations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_amount, description }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update allocation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgetAllocations.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      toast.success("예산이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "예산 수정에 실패했습니다.");
    },
  });
}

// ── Delete Allocation ──

export function useDeleteAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/budget-allocations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete allocation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgetAllocations.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      toast.success("예산 할당이 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "예산 삭제에 실패했습니다.");
    },
  });
}

// ── Save Period Settings ──

export function useSaveBudgetSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      period: string;
      welfare_amount?: number;
      leader_rate?: number;
      manager_rate?: number;
      pnc_extra_rate?: number;
      welfare_description?: string;
    }) => {
      const res = await fetch("/api/budget-allocations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save budget settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgetAllocations.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSettings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.pointsOverview.all });
      toast.success("반기 예산 설정이 반영되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "반기 예산 설정에 실패했습니다.");
    },
  });
}
