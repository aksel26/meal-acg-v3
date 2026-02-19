import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { PopularRestaurant } from "@/types/restaurant";

export type { PopularRestaurant };

interface PopularRestaurantsResponse {
  success: boolean;
  data: PopularRestaurant[];
  message?: string;
}

async function fetchPopularRestaurants(): Promise<PopularRestaurantsResponse> {
  const response = await fetch("/api/restaurants/popular");

  if (!response.ok) {
    let errorMessage = "인기 음식점 데이터를 불러오는데 실패했습니다.";

    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export function usePopularRestaurants() {
  return useQuery({
    queryKey: queryKeys.restaurants.popular(),
    queryFn: fetchPopularRestaurants,
    staleTime: 30 * 60 * 1000, // 30분 (누적 통계는 변경 빈도가 낮음)
    gcTime: 60 * 60 * 1000, // 1시간
    select: (data) => data.data,
  });
}
