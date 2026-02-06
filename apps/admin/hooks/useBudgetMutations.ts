"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

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
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetAllocations.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetAllocations.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetAllocations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      toast.success("예산 할당이 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "예산 삭제에 실패했습니다.");
    },
  });
}

// ── Bulk Upsert Allocations ──

export function useBulkUpsertAllocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      allocations: {
        member_id: string;
        allocation_type: string;
        period: string;
        total_amount: number;
        description?: string;
      }[];
    }) => {
      const res = await fetch("/api/budget-allocations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to bulk upsert allocations");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetAllocations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      const count = data?.count ?? 0;
      toast.success(`${count}명에게 예산이 할당되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "일괄 할당에 실패했습니다.");
    },
  });
}

// ── Calculate Activity Budget ──

export function useCalculateActivityBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      period: string;
      base_amount: number;
      per_member_amount: number;
    }) => {
      const res = await fetch("/api/budget-allocations/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to calculate activity budget");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetAllocations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      toast.success("활동비가 자동 계산되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "활동비 계산에 실패했습니다.");
    },
  });
}
