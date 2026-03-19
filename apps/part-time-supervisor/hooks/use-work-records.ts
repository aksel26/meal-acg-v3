"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { WorkRecord } from "@/lib/supabase/types";

export function useWorkRecords(assignmentId: string | null) {
  return useQuery<WorkRecord[]>({
    queryKey: queryKeys.workRecords.byAssignment(assignmentId!),
    queryFn: async () => {
      const res = await fetch(
        `/api/work-records?assignment_id=${assignmentId}`
      );
      if (!res.ok) throw new Error("Failed to fetch work records");
      return res.json();
    },
    enabled: !!assignmentId,
  });
}

export function useGenerateWorkRecords() {
  const queryClient = useQueryClient();

  return useMutation<WorkRecord[], Error, { assignmentId: string }>({
    mutationFn: async ({ assignmentId }) => {
      const res = await fetch("/api/work-records/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (!res.ok) throw new Error("Failed to generate work records");
      return res.json();
    },
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workRecords.byAssignment(assignmentId),
      });
    },
  });
}

export function useSaveWorkRecords() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkRecord[],
    Error,
    {
      assignmentId: string;
      records: { workDate: string; workHours: number; note?: string }[];
    }
  >({
    mutationFn: async ({ assignmentId, records }) => {
      const res = await fetch("/api/work-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, records }),
      });
      if (!res.ok) throw new Error("Failed to save work records");
      return res.json();
    },
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workRecords.byAssignment(assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.costManagement.all,
      });
    },
  });
}
