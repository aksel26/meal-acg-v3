import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { LunchFixedScheduleWithMember } from "@/lib/supabase/types";

async function fetchFixedSchedules(): Promise<LunchFixedScheduleWithMember[]> {
  const response = await fetch("/api/lunch-group/fixed-schedules", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "고정 스케줄 조회 실패");
  }

  return response.json();
}

export function useFixedSchedules() {
  return useQuery({
    queryKey: queryKeys.lunchGroup.fixedSchedules,
    queryFn: fetchFixedSchedules,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
  });
}
