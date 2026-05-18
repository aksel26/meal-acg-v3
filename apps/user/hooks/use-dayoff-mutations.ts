"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

interface CreateDayoffInput {
  authorId: string;
  targetId: string;
  startDate: string;
  endDate?: string;
  leaveTypeId: number;
  lateHour?: string;
  lateMinute?: string;
  approverId?: string;
  ccMemberIds?: string[];
  reason?: string;
}

interface UpdateDayoffInput {
  id: string;
  editorId: string;
  leaveDate?: string;
  leaveTypeId?: number;
  lateHour?: string;
  lateMinute?: string;
  approverId?: string;
  ccMemberIds?: string[];
  reason?: string;
  editReason?: string;
}

interface ApproveInput {
  id: string;
  approverId: string;
}

export function useCreateDayoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDayoffInput) => {
      const res = await fetch("/api/dayoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create dayoff");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dayoffs.all });
      toast.success("근태가 등록되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateDayoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateDayoffInput) => {
      const res = await fetch(`/api/dayoffs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update dayoff");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dayoffs.all });
      toast.success("근태가 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteDayoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dayoffs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete dayoff");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dayoffs.all });
      toast.success("근태가 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useApproveDayoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, approverId }: ApproveInput) => {
      const res = await fetch(`/api/dayoffs/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve dayoff");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dayoffs.all });
      toast.success("승인되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
