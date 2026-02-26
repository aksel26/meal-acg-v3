"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

// ── Advance Review ──

const REVIEW_STATUS_LABELS: Record<number, string> = {
  1: "P&C확인완료",
  2: "최종확인",
};

export function useAdvanceReview() {
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
        throw new Error(error.error || "Failed to advance review");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usageRecords.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      const record = Array.isArray(data) ? data[0] : data;
      const status = record?.review_status ?? 0;
      const label = REVIEW_STATUS_LABELS[status] || "확인";
      toast.success(`${label} 처리되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "확인 상태 변경에 실패했습니다.");
    },
  });
}

// ── Revert Review ──

export function useRevertReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reviewer_id,
      target_status,
    }: {
      id: string;
      reviewer_id: string;
      target_status: number;
    }) => {
      const res = await fetch(`/api/usage-records/${id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_id, target_status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to revert review");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usageRecords.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      const record = Array.isArray(data) ? data[0] : data;
      const status = record?.review_status ?? 0;
      const label = status === 0 ? "미확인" : REVIEW_STATUS_LABELS[status] || "확인";
      toast.success(`${label} 상태로 되돌렸습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "확인 상태 변경에 실패했습니다.");
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

// ── Bulk Delete Usage Records ──

export function useDeleteUsageRecords() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      modified_by,
    }: {
      ids: string[];
      modified_by: string;
    }) => {
      await Promise.all(
        ids.map(async (id) => {
          const params = new URLSearchParams();
          if (modified_by) params.set("modified_by", modified_by);
          const res = await fetch(`/api/usage-records/${id}?${params}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || `Failed to delete record ${id}`);
          }
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usageRecords.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || "일부 내역 삭제에 실패했습니다.");
    },
  });
}
