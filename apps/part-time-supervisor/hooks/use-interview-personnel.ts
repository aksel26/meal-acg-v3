"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { InterviewPersonnel } from "@/lib/interview-types";

export function useInterviewPersonnel(role?: string, search?: string) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (search) params.set("search", search);
  const qs = params.toString();

  return useQuery<InterviewPersonnel[]>({
    queryKey: [...queryKeys.interviewPersonnel.all, role, search],
    queryFn: async () => {
      const res = await fetch(`/api/interview/personnel${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

export function useCreatePersonnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<InterviewPersonnel>) => {
      const res = await fetch("/api/interview/personnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interviewPersonnel.all });
    },
  });
}

export function useUpdatePersonnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Partial<InterviewPersonnel>) => {
      const res = await fetch(`/api/interview/personnel/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interviewPersonnel.all });
    },
  });
}

export function useDeletePersonnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/interview/personnel/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interviewPersonnel.all });
    },
  });
}
