import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface CompanionMeal {
  store: string | null;
  amount: number;
  payer: string | null;
}

export interface Companion {
  name: string;
  meal: CompanionMeal | null;
}

export interface CompanionDay {
  date: string;
  label: string;
  subtitle: string | null;
  emptyMessage: string;
  people: Companion[];
}

interface MealCompanions {
  days: CompanionDay[];
}

interface MealCompanionsResponse {
  success: boolean;
  message: string;
  result: MealCompanions;
}

async function fetchMealCompanions(
  memberId: string,
  date: string,
): Promise<MealCompanions> {
  const params = new URLSearchParams({ member_id: memberId, date });
  const response = await fetch(`/api/lunch-group/meal-companions?${params.toString()}`);
  const result: MealCompanionsResponse = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "동료 식대 내역 조회 실패");
  }

  return result.result;
}

export function useMealCompanions(
  memberId: string | null,
  date: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.lunchGroup.mealCompanions(memberId ?? "", date),
    queryFn: () => fetchMealCompanions(memberId ?? "", date),
    enabled: enabled && !!memberId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
