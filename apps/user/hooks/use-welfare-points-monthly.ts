import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface ActivityPointsStats {
  position: string;
  name: string;
  totalAmount: string;
  remainingAmount: string;
  usedAmount: string;
}

interface WelfarePointsStats {
  position: string;
  name: string;
  totalAmount: string;
  remainingAmount: string;
  usedAmount: string;
}

interface WelfareUsageHistory {
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

interface WelfarePointsData {
  activityStats: ActivityPointsStats | null;
  welfareStats: WelfarePointsStats | null;
  history: WelfareUsageHistory[];
  summary: {
    monthlyUsedAmount: number;
    totalAvailableAmount: number;
    remainingAmount: number;
    usageCount: number;
  };
}

interface WelfarePointsResponse {
  success: boolean;
  data: WelfarePointsData;
  message?: string;
  error?: string;
  details?: string;
}

async function fetchWelfarePointsMonthly(name: string, year: number, month: number): Promise<WelfarePointsResponse> {
  const params = new URLSearchParams({
    name,
    year: year.toString(),
    month: month.toString(),
  });

  const response = await fetch(`/api/welfare-points?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "복지포인트 월별 현황을 가져오는데 실패했습니다.");
  }

  return data;
}

export function useWelfarePointsMonthly(name: string, year: number, month: number, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.welfarePoints.byNameAndMonth(name, year, month),
    queryFn: () => fetchWelfarePointsMonthly(name, year, month),
    enabled: !!name && !!year && !!month && enabled,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    retry: 2,
  });
}
