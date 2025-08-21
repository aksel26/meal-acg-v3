// /import { useQuery } from "@tanstack/react-query";

import { useQuery } from "@tanstack/react-query";

interface HolidayData {
  name: string;
  date: string;
}

// 공휴일 API 호출 함수
const fetchHolidays = async (month: number): Promise<HolidayData[]> => {
  const response = await fetch(`/api/holidays?month=${month}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch holidays: ${response.statusText}`);
  }

  return response.json();
};

// 공휴일 데이터를 가져오는 React Query 훅
export const useHolidays = (month: number, year: number) => {
  return useQuery({
    queryKey: ["holidays", month, year],
    queryFn: () => fetchHolidays(month),
    staleTime: 1000 * 60 * 60 * 24, // 24시간 동안 fresh
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7일 동안 캐시 유지
    enabled: !!month && month >= 1 && month <= 12, // month가 유효할 때만 실행
    retry: 2, // 실패 시 2번 재시도
    retryDelay: 1000, // 1초 후 재시도
  });
};

export type { HolidayData };
