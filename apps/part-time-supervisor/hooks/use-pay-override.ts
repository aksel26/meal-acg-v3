"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

type PayOverrideInput = {
  assignmentId: string;
  payRate: number | null;
  payType: "hourly" | "daily" | null;
};

export function usePayOverride() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, PayOverrideInput>({
    mutationFn: async ({ assignmentId, payRate, payType }) => {
      const res = await fetch(
        `/api/assignments/${assignmentId}/pay-override`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payRate, payType }),
        }
      );
      if (!res.ok) throw new Error("Failed to update pay override");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.costManagement.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.all,
      });
    },
  });
}
