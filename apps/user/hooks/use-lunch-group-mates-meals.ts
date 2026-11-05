import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface LunchGroupMateMeal {
  store: string | null;
  amount: number;
  payer: string | null;
}

export interface LunchGroupMate {
  name: string;
  meals: Record<string, LunchGroupMateMeal>;
}

export interface LunchGroupMatesMeals {
  weekStartDate: string;
  groupNumber: number | null;
  mates: LunchGroupMate[];
}

interface LunchGroupMatesMealsResponse {
  success: boolean;
  message: string;
  result: LunchGroupMatesMeals;
}

async function fetchLunchGroupMatesMeals(
  memberId: string,
  date: string,
): Promise<LunchGroupMatesMeals> {
  const params = new URLSearchParams({ member_id: memberId, date });
  const response = await fetch(`/api/lunch-group/mates-meals?${params.toString()}`);
  const result: LunchGroupMatesMealsResponse = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "조원 식대 내역 조회 실패");
  }

  return result.result;
}

export function useLunchGroupMatesMeals(
  memberId: string | null,
  date: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.lunchGroup.matesMeals(memberId ?? "", date),
    queryFn: () => fetchLunchGroupMatesMeals(memberId ?? "", date),
    enabled: enabled && !!memberId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
