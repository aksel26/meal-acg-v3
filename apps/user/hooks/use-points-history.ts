import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface PointsHistory {
  name: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: string;
  type: string;
  vendor: string;
  amount: number;
  confirmationContent: string;
  notes?: string;
  confirmed: boolean;
}

interface PointsHistoryData {
  all: PointsHistory[];
  activity: PointsHistory[];
  welfare: PointsHistory[];
  summary: {
    totalActivityAmount: number;
    totalWelfareAmount: number;
    totalAmount: number;
    activityCount: number;
    welfareCount: number;
    totalCount: number;
  };
}

interface PointsHistoryResponse {
  success: boolean;
  data: PointsHistoryData;
  message?: string;
  error?: string;
  details?: string;
}

async function fetchPointsHistory(
  name: string, 
  year: number, 
  month: number
): Promise<PointsHistoryResponse> {
  const params = new URLSearchParams({
    name,
    year: year.toString(),
    month: month.toString()
  });
  
  const response = await fetch(`/api/points/history?${params}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "포인트 내역을 가져오는데 실패했습니다.");
  }
  
  return data;
}

export function usePointsHistory(
  name: string, 
  year: number, 
  month: number, 
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.pointsHistory.byNameAndMonth(name, year, month),
    queryFn: () => fetchPointsHistory(name, year, month),
    enabled: !!name && !!year && !!month && enabled,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    retry: 2,
  });
}