import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface CalculationData {
  fileName: string;
  month: number;
  workDays: number;
  holidayWorkDays: number;
  vacationDays: number;
  availableAmount: number;
  totalUsed: number;
  balance: number;
}

interface CalculationResponse {
  success: boolean;
  data: CalculationData;
}

async function fetchCalculationData(userName: string, month: number, year?: number): Promise<CalculationData> {
  if (!userName) {
    throw new Error("User name is required");
  }

  const response = await fetch(`/api/semester/calculate?month=${month}&name=${encodeURIComponent(userName)}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "계산 실패");
  }

  const result: CalculationResponse = await response.json();
  return result.data;
}

export function useCalculationData(userName: string, month: number, year?: number) {
  return useQuery({
    queryKey: queryKeys.calculation.byUserAndMonth(userName, month, year),
    queryFn: () => fetchCalculationData(userName, month, year),
    enabled: !!userName, // userName이 있을 때만 쿼리 실행
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지 (구 cacheTime)
  });
}