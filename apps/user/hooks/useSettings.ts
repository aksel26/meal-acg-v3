import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface SettingsData {
  dailyAllowance: number;
  monthlyAllowances: Record<string, Record<string, { allowance: number; workdays: number }>>;
}

interface SettingsResponse {
  success: boolean;
  data: SettingsData;
  error?: string;
}

async function fetchSettings(): Promise<SettingsData> {
  const response = await fetch("/api/settings");

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "설정 조회 실패");
  }

  const result: SettingsResponse = await response.json();
  if (!result.success) {
    throw new Error(result.error || "설정 조회 실패");
  }

  return result.data;
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: fetchSettings,
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
  });
}

// 개별식사 금액만 가져오는 훅
export function useIndividualMealAmount() {
  const { data, isLoading, error } = useSettings();

  return {
    amount: data?.dailyAllowance ?? 10000,
    isLoading,
    error,
  };
}
