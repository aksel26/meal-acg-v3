import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface AssignDrinkRequest {
  name: string;
  drink: string;
  collectionId?: string;
}

async function assignDrinkFn({
  name,
  drink,
  collectionId,
}: AssignDrinkRequest): Promise<void> {
  const response = await fetch("/api/monthly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, drink, collectionId }),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.monthly.all });
    },
  });
};
