import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface WelfarePointInput {
  name: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek?: string;
  type: string;
  vendor: string;
  amount: number;
  notes?: string;
}

interface WelfarePointUpdate extends WelfarePointInput {
  no: number;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

// 복지포인트 추가
export const useAddWelfarePoint = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse, Error, WelfarePointInput>({
    mutationFn: async (data: WelfarePointInput) => {
      const response = await fetch("/api/welfare-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to add welfare point");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // 성공 시 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.welfarePoints.byNameAndMonth(
          variables.name,
          variables.year,
          variables.month
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.welfarePoints.byNameAndYear(variables.name, variables.year),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.welfarePoints.all,
      });
    },
  });
};

// 복지포인트 수정
export const useUpdateWelfarePoint = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse, Error, WelfarePointUpdate>({
    mutationFn: async (data: WelfarePointUpdate) => {
      const response = await fetch("/api/welfare-points", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update welfare point");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // 성공 시 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.welfarePoints.byNameAndMonth(
          variables.name,
          variables.year,
          variables.month
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.welfarePoints.byNameAndYear(variables.name, variables.year),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.welfarePoints.all,
      });
    },
  });
};

// 복지포인트 삭제
export const useDeleteWelfarePoint = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse, Error, { no: number; name: string; year: number; month: number }>({
    mutationFn: async ({ no }: { no: number; name: string; year: number; month: number }) => {
      const response = await fetch(`/api/welfare-points?no=${no}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete welfare point");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // 성공 시 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.welfarePoints.byNameAndMonth(
          variables.name,
          variables.year,
          variables.month
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.welfarePoints.byNameAndYear(variables.name, variables.year),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.welfarePoints.all,
      });
    },
  });
};