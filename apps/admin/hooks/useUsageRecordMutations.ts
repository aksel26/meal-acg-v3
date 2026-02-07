"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

// ── Toggle Review ──

export function useToggleReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reviewer_id,
    }: {
      id: string;
      reviewer_id: string;
    }) => {
      const res = await fetch(`/api/usage-records/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to toggle review");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usageRecords.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      const isReviewed = data?.is_reviewed;
      toast.success(
        isReviewed ? "검토 완료 처리되었습니다." : "미검토 상태로 변경되었습니다."
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "검토 상태 변경에 실패했습니다.");
    },
  });
}

// ── Update Usage Record ──

export function useUpdateUsageRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      amount?: number;
      description?: string;
      used_at?: string;
      notes?: string | null;
      modified_by?: string;
    }) => {
      const res = await fetch(`/api/usage-records/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update usage record");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usageRecords.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      toast.success("사용내역이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "사용내역 수정에 실패했습니다.");
    },
  });
}

// ── Delete Usage Record ──

export function useDeleteUsageRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      modified_by,
    }: {
      id: string;
      modified_by: string;
    }) => {
      const params = new URLSearchParams();
      if (modified_by) params.set("modified_by", modified_by);
      const res = await fetch(`/api/usage-records/${id}?${params}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete usage record");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usageRecords.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      toast.success("사용내역이 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "사용내역 삭제에 실패했습니다.");
    },
  });
}
