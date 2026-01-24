import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface MealStatsData {
  allowanceAmount: number; // 실제 사용가능 금액 (개별식사 차감 후)
  originalAllowance?: number; // 원래 월별 지원금
  totalUsed: number;
  balance: number;
  mealCount: number;
  individualMealCount?: number; // 개별식사 수
  individualMealDeduction?: number; // 개별식사 차감액
  dailyAllowance?: number; // 일일 지원금
}

interface MealStatsResponse {
  success: boolean;
  data: MealStatsData;
  error?: string;
}

async function fetchMealStats(
  userId: string,
  month: number,
  year?: number
): Promise<MealStatsData> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const yearParam = year || new Date().getFullYear();
  const response = await fetch(
    `/api/meals/stats?month=${month}&year=${yearParam}&user_id=${encodeURIComponent(userId)}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "통계 조회 실패");
  }

  const result: MealStatsResponse = await response.json();
  if (!result.success) {
    throw new Error(result.error || "통계 조회 실패");
  }
  return result.data;
}

export function useCalculationData(
  userId: string,
  month: number,
  year?: number
) {
  return useQuery({
    queryKey: queryKeys.mealStats.byUserAndMonth(userId, month, year),
    queryFn: () => fetchMealStats(userId, month, year),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
