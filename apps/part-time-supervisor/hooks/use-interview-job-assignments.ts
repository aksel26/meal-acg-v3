import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { InterviewJobAssignment } from "@/lib/interview-types";

export function useInterviewJobAssignments(jobPostingId: string | null) {
  return useQuery<InterviewJobAssignment[]>({
    queryKey: queryKeys.interviewJobAssignments.byJobPosting(jobPostingId!),
    queryFn: async () => {
      const res = await fetch(
        `/api/interview/job-postings/${jobPostingId}/assignments`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!jobPostingId,
  });
}

export function useCreateInterviewJobAssignment(jobPostingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: {
        personnel_id?: string;
        new_personnel?: Record<string, unknown>;
        pay_type?: string;
        pay_rate?: number;
        work_hours?: number | null;
        note?: string;
      },
    ) => {
      const res = await fetch(
        `/api/interview/job-postings/${jobPostingId}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewJobAssignments.byJobPosting(jobPostingId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewJobPostings.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewSettlement.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateInterviewJobAssignment(jobPostingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: { assignmentId: string } & Record<string, unknown>,
    ) => {
      const { assignmentId, ...body } = data;
      const res = await fetch(
        `/api/interview/job-postings/${jobPostingId}/assignments/${assignmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewJobAssignments.byJobPosting(jobPostingId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewJobPostings.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewSettlement.all,
      });
    },
  });
}

export function useDeleteInterviewJobAssignment(jobPostingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(
        `/api/interview/job-postings/${jobPostingId}/assignments/${assignmentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewJobAssignments.byJobPosting(jobPostingId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewJobPostings.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewSettlement.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
