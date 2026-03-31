"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

export interface Title {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useTitles() {
  return useQuery<Title[]>({
    queryKey: queryKeys.titles.all,
    queryFn: async () => {
      const res = await fetch("/api/titles");
      if (!res.ok) throw new Error("Failed to fetch titles");
      return res.json();
    },
  });
}

export function useCreateTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Title>) => {
      const res = await fetch("/api/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create title");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.titles.all });
      toast.success("직책이 추가되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Title> & { id: string }) => {
      const res = await fetch(`/api/titles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update title");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.titles.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.memberStatuses.all });
      toast.success("직책이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/titles/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete title");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.titles.all });
      toast.success("직책이 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
