"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

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
      queryClient.invalidateQueries({ queryKey: queryKeys.memberStatuses.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.memberStatuses.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.memberStatuses.all });
      toast.success("특이사항이 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "특이사항 삭제에 실패했습니다.");
    },
  });
}
