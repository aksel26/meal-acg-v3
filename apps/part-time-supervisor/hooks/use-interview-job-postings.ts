import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type {
  InterviewJobPosting,
  InterviewJobPostingWithCount,
} from "@/lib/interview-types";

export function useInterviewJobPostings() {
  return useQuery<InterviewJobPostingWithCount[]>({
    queryKey: queryKeys.interviewJobPostings.all,
    queryFn: async () => {
      const res = await fetch("/api/interview/job-postings");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

export function useInterviewJobPosting(id: string | null) {
  return useQuery<InterviewJobPosting>({
    queryKey: queryKeys.interviewJobPostings.detail(id!),
    queryFn: async () => {
      const res = await fetch(`/api/interview/job-postings/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateInterviewJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<InterviewJobPosting>) => {
      const res = await fetch("/api/interview/job-postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewJobPostings.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateInterviewJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<InterviewJobPosting> & { id: string }) => {
      const { id, ...body } = data;
      const res = await fetch(`/api/interview/job-postings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewJobPostings.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteInterviewJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/interview/job-postings/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewJobPostings.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
