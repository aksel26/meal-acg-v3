import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface AssignDrinkRequest {
  name: string;
  drink: string;
}

async function assignDrinkFn({ name, drink }: AssignDrinkRequest): Promise<void> {
  const response = await fetch("/api/monthly", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, drink }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || `HTTP error! status: ${response.status}`);
  }
}

export const useAssignDrink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignDrinkFn,
    onSuccess: () => {
      // 성공 시 monthly 데이터 무효화하여 자동 리패치
      queryClient.invalidateQueries({ queryKey: queryKeys.monthly.all });
    },
  });
};
