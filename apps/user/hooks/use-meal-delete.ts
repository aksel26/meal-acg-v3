import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

interface MealDeleteData {
  userName: string;
  date: string;
}

interface MealDeleteResponse {
  success: boolean;
  message: string;
  data: {
    userName: string;
    date: string;
    semesterInfo: {
      semester: "상반기" | "하반기";
      folderName: string;
      currentYear: number;
    };
    results: Array<{
      fileName: string;
      date: string;
      deletedData?: {
        row: number;
        deletedColumns: string[];
      };
      error?: string;
    }>;
  };
}

async function deleteMealData(data: MealDeleteData): Promise<MealDeleteResponse> {
  const response = await fetch("/api/meals/delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.details || errorData.error || "식사 기록 삭제에 실패했습니다.");
  }

  return response.json();
}

export function useMealDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMealData,
    onMutate: () => {
      // 로딩 토스트 표시
      const loadingToast = toast.loading("식사 기록을 삭제하는 중...");
      
      // 토스트 ID를 반환해서 나중에 제거할 수 있도록 함
      return { loadingToast };
    },
    onSuccess: (data, variables, context) => {
      // 로딩 토스트 제거
      if (context?.loadingToast) {
        toast.dismiss(context.loadingToast);
      }

      // 성공 토스트 표시
      toast.success("식사 기록이 삭제되었습니다.");

      // 관련 쿼리 무효화
      const date = new Date(variables.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // 식사 데이터 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.meals.byUserAndMonth(variables.userName, month, year)
      });

      // 계산 데이터도 무효화 (식사 금액이 바뀌면 계산도 영향을 받음)
      queryClient.invalidateQueries({
        queryKey: queryKeys.calculation.byUserAndMonth(variables.userName, month, year)
      });

      console.log("Delete result:", data);
    },
    onError: (error, _variables, context) => {
      // 로딩 토스트 제거
      if (context?.loadingToast) {
        toast.dismiss(context.loadingToast);
      }

      // 에러 토스트 표시
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(`식사 기록 삭제에 실패했습니다: ${errorMessage}`);

      console.error("Meal delete error:", error);
    },
  });
}