import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface MealData {
  date: string;
  attendance: string;
  lunch?: {
    store: string;
    amount: number;
    payer: string;
  };
  dinner?: {
    store: string;
    amount: number;
    payer: string;
  };
  breakfast?: {
    store: string;
    amount: number;
    payer: string;
  };
}

interface MealDataResponse {
  success: boolean;
  data: MealData[];
}

async function fetchMealData(userName: string, month: number, year: number): Promise<MealData[]> {
  if (!userName) {
    throw new Error("User name is required");
  }

  const response = await fetch(`/api/calendar/meals?month=${month}&name=${encodeURIComponent(userName)}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "식사 데이터 조회 실패");
  }

  const result: MealDataResponse = await response.json();
  return result.data || [];
}

export function useMealData(userName: string, month: number, year: number) {
  return useQuery({
    queryKey: queryKeys.meals.byUserAndMonth(userName, month, year),
    queryFn: () => fetchMealData(userName, month, year),
    enabled: !!userName, // userName이 있을 때만 쿼리 실행
    staleTime: 2 * 60 * 1000, // 2분간 fresh 상태 유지 (식사 데이터는 자주 변경될 수 있음)
    gcTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
}

// 특정 날짜의 식사 데이터만 조회하는 hook (필요한 경우)
export function useMealDataByDate(userName: string, date: string) {
  return useQuery({
    queryKey: queryKeys.meals.byUserAndDate(userName, date),
    queryFn: async () => {
      const response = await fetch(`/api/calendar/meals?date=${date}&name=${encodeURIComponent(userName)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "식사 데이터 조회 실패");
      }
      const result: MealDataResponse = await response.json();
      return result.data || [];
    },
    enabled: !!userName && !!date,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}