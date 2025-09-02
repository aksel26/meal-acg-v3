import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface UsageDetail {
  name: string;           // B열: 직원 이름
  year: number;           // C열: 연도
  month: number;          // D열: 월
  day: number;            // E열: 일
  dayOfWeek: string;      // F열: 요일
  type: string;           // G열: 유형(활동비 또는 복지포인트)
  vendor: string;         // H열: 사용처
  amount: number;         // I열: 금액
  confirmationContent: string; // J열: 확인내용
  notes?: string;         // K열: 비고
  confirmed: boolean;     // J열에 색상이 칠해져 있으면 확인완료
}

interface UsageResponse {
  success: boolean;
  data: UsageDetail[];
  message?: string;
  error?: string;
  details?: string;
}

async function fetchUsageDetails(employeeName: string, year: number, month?: number): Promise<UsageResponse> {
  const params = new URLSearchParams({
    employeeName,
    year: year.toString(),
    ...(month && { month: month.toString() })
  });
  
  const response = await fetch(`/api/activity-points/usage?${params}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "활동비 사용 내역을 가져오는데 실패했습니다.");
  }
  
  return data;
}

export function useActivityPointUsage(
  employeeName: string, 
  year: number, 
  month?: number, 
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.activityPoints.usage(employeeName, `${year}${month ? `-${month}` : ''}`),
    queryFn: () => fetchUsageDetails(employeeName, year, month),
    enabled: !!employeeName && !!year && enabled,
    staleTime: 1 * 60 * 1000, // 1분
    gcTime: 3 * 60 * 1000, // 3분
    retry: 2,
  });
}