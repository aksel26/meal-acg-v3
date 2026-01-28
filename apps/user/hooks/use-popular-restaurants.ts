import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface PopularRestaurant {
  name: string;
  count: number;
  percentage: number;
}

interface PopularRestaurantsResponse {
  success: boolean;
  data: PopularRestaurant[];
  message?: string;
}

async function fetchPopularRestaurants(): Promise<PopularRestaurantsResponse> {
  const response = await fetch("/api/restaurants/popular");

  if (!response.ok) {
    throw new Error("인기 음식점 데이터를 불러오는데 실패했습니다.");
  }

  return response.json();
}

export function usePopularRestaurants() {
  return useQuery({
    queryKey: queryKeys.restaurants.popular(),
    queryFn: fetchPopularRestaurants,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    select: (data) => data.data,
  });
}
