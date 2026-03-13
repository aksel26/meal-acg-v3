"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Assignment, AssignmentWithDetails } from "@/lib/supabase/types";

type AssignmentWithRelations = Assignment & {
  worker: { id: string; name: string; phone: string | null; status: string } | null;
  job_posting: { id: string; title: string; status: string } | null;
};

export function useAssignmentsByJobPosting(jobPostingId: string | null) {
  return useQuery<AssignmentWithDetails[]>({
    queryKey: queryKeys.assignments.byJobPosting(jobPostingId!),
    queryFn: async () => {
      const res = await fetch(`/api/assignments?job_posting_id=${jobPostingId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!jobPostingId,
  });
}

export function useAssignments(filters?: { jobPostingId?: string; workerId?: string }) {
  const params = new URLSearchParams();
  if (filters?.jobPostingId) params.set("job_posting_id", filters.jobPostingId);
  if (filters?.workerId) params.set("worker_id", filters.workerId);
  const qs = params.toString();

  return useQuery<AssignmentWithRelations[]>({
    queryKey: [...queryKeys.assignments.all, filters?.jobPostingId, filters?.workerId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}
