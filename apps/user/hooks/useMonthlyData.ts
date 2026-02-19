import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface UserApplication {
  name: string;
  memo?: string;
  drink: string;
}

export interface PickupPerson {
  name: string;
}

export interface DrinkOption {
  name: string;
  available: boolean;
}

export interface MonthlyData {
  applications: UserApplication[];
  drinkOptions: DrinkOption[];
  pickupPersons: PickupPerson[];
  totalMembers: number;
}

async function fetchMonthlyData(): Promise<MonthlyData> {
  const response = await fetch("/api/monthly", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch monthly data: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.success && result.data) {
    return result.data;
  }

  throw new Error("Invalid response format");
}

export const useMonthlyData = () => {
  return useQuery({
    queryKey: queryKeys.monthly.data,
    queryFn: fetchMonthlyData,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  });
};
