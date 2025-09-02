import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface WelfarePointsSummary {
  name: string;
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  monthlyUsage: number[]; // 1-12월 사용 금액 배열
}

interface WelfarePointsResponse {
  success: boolean;
  data: WelfarePointsSummary;
  message?: string;
  error?: string;
  details?: string;
}

async function fetchWelfarePoints(
  name: string, 
  year: number
): Promise<WelfarePointsResponse> {
  const params = new URLSearchParams({
    name,
    year: year.toString()
  });
  
  const response = await fetch(`/api/points/welfare-points?${params}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "복지포인트 현황을 가져오는데 실패했습니다.");
  }
  
  return data;
}

export function useWelfarePoints(
  name: string, 
  year: number, 
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.welfarePoints.byNameAndYear(name, year),
    queryFn: () => fetchWelfarePoints(name, year),
    enabled: !!name && !!year && enabled,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    retry: 2,
  });
}