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

export interface DrinkCollectionItem {
  id: string;
  title: string;
  year: number;
  month: number | null;
  is_active: boolean;
  is_one_time: boolean;
  drink_options: string[];
  pickup_persons: string[];
  created_at: string;
}

async function fetchMonthlyData(collectionId?: string): Promise<MonthlyData> {
  const url = collectionId
    ? `/api/monthly?collectionId=${collectionId}`
    : "/api/monthly";

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
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

export const useMonthlyData = (collectionId?: string) => {
  return useQuery({
    queryKey: collectionId
      ? queryKeys.monthly.collection(collectionId)
      : queryKeys.monthly.data,
    queryFn: () => fetchMonthlyData(collectionId),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

async function fetchCollections(): Promise<DrinkCollectionItem[]> {
  const response = await fetch("/api/monthly/collections");
  if (!response.ok) throw new Error("Failed to fetch collections");
  const result = await response.json();
  return result.data || [];
}

export const useCollections = () => {
  return useQuery({
    queryKey: queryKeys.monthly.collections,
    queryFn: fetchCollections,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
