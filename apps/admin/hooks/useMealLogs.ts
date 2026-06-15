"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface MealLogWithMember {
  id: string;
  user_id: string;
  entry_date: string;
  attendance: string | null;
  breakfast_store: string | null;
  breakfast_amount: number | null;
  breakfast_payer: string | null;
  lunch_store: string | null;
  lunch_amount: number | null;
  lunch_payer: string | null;
  dinner_store: string | null;
  dinner_amount: number | null;
  dinner_payer: string | null;
  total_amount: number | null;
  members?: { full_name: string } | null;
}

/**
 * 특정 연/월의 전체 식대 사용 기록(meal_logs)을 조회합니다.
 * 각 row는 하루 단위로 아침/점심/저녁 사용처·금액·결제자를 포함합니다.
 */
export function useMealLogs(year: number, month: number) {
  return useQuery<MealLogWithMember[]>({
    queryKey: queryKeys.mealLogs.byMonth(year, month),
    queryFn: async () => {
      const res = await fetch(`/api/meal-logs?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch meal logs");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
