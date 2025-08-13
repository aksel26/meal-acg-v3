import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface LunchGroup {
  groupNumber: string;
  person: string[];
}

export interface LunchGroupData {
  totalMembers: string;
  membersPerGroup: string;
  prevDate: string;
  nextDate: string;
  groups: LunchGroup[];
  mondayMember: string;
  fridayMember: string;
}

interface LunchGroupResponse {
  success: boolean;
  message: string;
  result: LunchGroupData;
}

async function fetchLunchGroupData(): Promise<LunchGroupData> {
  const response = await fetch("/api/lunch-group", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "점심조 데이터 조회 실패");
  }

  const result: LunchGroupResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || "점심조 데이터 조회 실패");
  }

  return result.result;
}

export function useLunchGroup() {
  return useQuery({
    queryKey: queryKeys.lunchGroup.current,
    queryFn: fetchLunchGroupData,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    retry: 2, // 실패 시 2번 재시도
    refetchOnWindowFocus: false, // 윈도우 포커스시 자동 refetch 비활성화
  });
}