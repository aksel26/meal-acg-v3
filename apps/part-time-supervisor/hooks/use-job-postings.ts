"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { JobPosting } from "@/lib/supabase/types";

type JobPostingWithCount = JobPosting & {
  assignments: { count: number }[];
};

export function useJobPostings(status?: string) {
  return useQuery<JobPostingWithCount[]>({
    queryKey: [...queryKeys.jobPostings.all, status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : "";
      const res = await fetch(`/api/job-postings${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

export function useJobPosting(id: string | null) {
  return useQuery<JobPosting>({
    queryKey: queryKeys.jobPostings.detail(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("No id provided");
      const res = await fetch(`/api/job-postings/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!id,
  });
}
