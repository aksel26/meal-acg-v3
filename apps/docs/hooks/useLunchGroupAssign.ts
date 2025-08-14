import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface LunchGroupAssignRequest {
  userName: string;
}

interface LunchGroupAssignResponse {
  success: boolean;
  message: string;
  data: {
    cell: {
      row: number;
      col: number;
    };
    groupNumber: number;
    userName: string;
  };
}

interface LunchGroupAssignError {
  success: false;
  error: string;
}

async function assignLunchGroup(request: LunchGroupAssignRequest): Promise<LunchGroupAssignResponse> {
  const response = await fetch("/api/lunch-group/assign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const result = await response.json();

  if (!response.ok) {
    const errorData = result as LunchGroupAssignError;
    throw new Error(errorData.error || "점심조 배정에 실패했습니다.");
  }

  if (!result.success) {
    throw new Error(result.error || "점심조 배정에 실패했습니다.");
  }

  return result;
}

export function useLunchGroupAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignLunchGroup,
    onSuccess: (data) => {
      // 성공시 관련 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.lunchGroup.all,
      });
      
      // 사용자 목록도 업데이트될 수 있으므로 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.all,
      });
    },
    onError: (error) => {
      console.error("Lunch group assignment failed:", error);
    },
  });
}