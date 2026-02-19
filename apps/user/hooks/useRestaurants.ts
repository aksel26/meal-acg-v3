import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface Restaurant {
  id: string;
  name: string;
  business_number: string | null;
}

interface RestaurantsResponse {
  success: boolean;
  message?: string;
  data: Restaurant[];
}

interface CreateRestaurantResponse {
  success: boolean;
  message: string;
  data: Restaurant | null;
}

async function fetchRestaurants(): Promise<Restaurant[]> {
  const response = await fetch("/api/restaurants", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "식당 목록 조회 실패");
  }

  const result: RestaurantsResponse = await response.json();

  if (!result.success) {
    throw new Error(result.message || "식당 목록 조회 실패");
  }

  return result.data;
}

async function createRestaurant(data: { name: string; business_number?: string | null }): Promise<CreateRestaurantResponse> {
  const response = await fetch("/api/restaurants", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result: CreateRestaurantResponse = await response.json();

  if (!response.ok && !result.success) {
    throw new Error(result.message || "식당 등록 실패");
  }

  return result;
}

// 식당 목록 조회 훅
export function useRestaurants() {
  return useQuery({
    queryKey: queryKeys.restaurants.list,
    queryFn: fetchRestaurants,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// 식당명 목록만 반환하는 훅 (자동완성용)
export function useRestaurantNames() {
  const { data, isLoading, error } = useRestaurants();

  const restaurantNames =
    data?.map((r) => (r.business_number ? `${r.name}(${r.business_number})` : r.name)) || [];

  return { restaurantNames, isLoading, error };
}

// 식당 등록 mutation 훅
export function useCreateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRestaurant,
    onSuccess: () => {
      // 식당 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.all });
    },
  });
}

// 식당명에서 이름과 사업자번호 분리
export function parseRestaurantName(displayName: string): { name: string; business_number: string | null } {
  // "식당명(사업자번호)" 형식 파싱
  const match = displayName.match(/^(.+?)\(([^)]+)\)$/);
  if (match && match[1] && match[2]) {
    return {
      name: match[1].trim(),
      business_number: match[2].trim(),
    };
  }
  return {
    name: displayName.trim(),
    business_number: null,
  };
}
