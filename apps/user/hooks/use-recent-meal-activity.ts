import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface RecentMealActivity {
  id: string;
  userName: string;
  date: string;
  mealTypes: string[];
  mealDetails?: { type: string; store: string | null }[];
  store: string | null;
  amount: number;
  attendance: string | null;
  updatedAt: string | null;
}

interface RecentMealActivityResponse {
  success: boolean;
  data: RecentMealActivity[];
  error?: string;
}

async function fetchRecentMealActivity(
  excludeUserId?: string,
): Promise<RecentMealActivity[]> {
  const params = new URLSearchParams({ limit: "12" });

  if (excludeUserId) {
    params.set("exclude_user_id", excludeUserId);
  }

  const response = await fetch(`/api/meals/recent?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "최근 식대 입력 내역 조회 실패");
  }

  const result: RecentMealActivityResponse = await response.json();
  if (!result.success) {
    throw new Error(result.error || "최근 식대 입력 내역 조회 실패");
  }

  return result.data;
}

export function useRecentMealActivity(excludeUserId?: string) {
  return useQuery({
    queryKey: queryKeys.meals.recentActivity(excludeUserId),
    queryFn: () => fetchRecentMealActivity(excludeUserId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
