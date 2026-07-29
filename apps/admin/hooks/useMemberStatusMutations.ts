"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

/** 특이사항 변경 시 관련 쿼리 일괄 무효화 (대시보드 총 인원, 통계 등) */
function invalidateStatusRelated(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.memberStatuses.all });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.budgetAllocations.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.pointsOverview.all });
}

// ── Create Member Status ──

export function useCreateMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      member_id: string;
      status: string;
      start_date: string;
      end_date?: string;
      note?: string;
    }) => {
      const res = await fetch("/api/member-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create member status");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateStatusRelated(queryClient);
      toast.success("특이사항이 등록되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "특이사항 등록에 실패했습니다.");
    },
  });
}

// ── Update Member Status ──

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      status?: string;
      start_date?: string;
      end_date?: string | null;
      note?: string | null;
    }) => {
      const res = await fetch(`/api/member-statuses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update member status");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateStatusRelated(queryClient);
      toast.success("특이사항이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "특이사항 수정에 실패했습니다.");
    },
  });
}

// ── Delete Member Status ──

export function useDeleteMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/member-statuses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete member status");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateStatusRelated(queryClient);
      toast.success("특이사항이 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "특이사항 삭제에 실패했습니다.");
    },
  });
}
