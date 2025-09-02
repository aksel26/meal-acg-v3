import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface ActivityPointDetails {
  name: string;          // C열: 이름
  personalAmount: number; // E열: 개인 활동비
  teamAmount: number;     // F열: 팀 활동비
}

interface DetailsResponse {
  success: boolean;
  data?: ActivityPointDetails;
  message?: string;
  error?: string;
  details?: string;
}

async function fetchActivityPointDetails(name: string): Promise<DetailsResponse> {
  const response = await fetch(`/api/activity-points/details?name=${encodeURIComponent(name)}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "활동비 상세 정보를 가져오는데 실패했습니다.");
  }
  
  return data;
}

export function useActivityPointDetails(name: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.activityPoints.usage(name, "details"), // 기존 usage 키 재활용
    queryFn: () => fetchActivityPointDetails(name),
    enabled: !!name && enabled,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    retry: 2,
  });
}