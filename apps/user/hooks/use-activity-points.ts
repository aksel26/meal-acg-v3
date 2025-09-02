import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface ActivityPointStatistics {
  position: string;      // B열: 직책
  name: string;          // C열: 이름
  totalAmount: number;   // D열: 활동비 총 금액
  remainingAmount: number; // F열: 활동비 잔여 금액
  usedAmount: number;    // H열: 활동비 사용금액
  monthlyUsage: number[]; // J~P열: 월별 사용 금액 (1월~12월)
}

interface ActivityPointsResponse {
  success: boolean;
  data: ActivityPointStatistics[];
  message?: string;
  error?: string;
  details?: string;
}

async function fetchActivityPoints(): Promise<ActivityPointsResponse> {
  const response = await fetch(`/api/activity-points`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "활동비 통계 데이터를 가져오는데 실패했습니다.");
  }
  
  return data;
}

export function useActivityPoints() {
  return useQuery({
    queryKey: queryKeys.activityPoints.all,
    queryFn: () => fetchActivityPoints(),
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}