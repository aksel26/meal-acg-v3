import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

interface MealDeleteData {
  userName: string;
  userId?: string;
  date: string;
  mealType?: "breakfast" | "lunch" | "dinner";
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
    throw new Error(errorData.details || errorData.error || "식대 기록 삭제에 실패했습니다.");
  }

  return response.json();
}

export function useMealDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMealData,
    onMutate: () => {
      // 로딩 토스트 표시
      const loadingToast = toast.loading("식대 기록을 삭제하는 중...");
      
      // 토스트 ID를 반환해서 나중에 제거할 수 있도록 함
      return { loadingToast };
    },
    onSuccess: (data, variables, context) => {
      // 로딩 토스트 제거
      if (context?.loadingToast) {
        toast.dismiss(context.loadingToast);
      }

      // 성공 토스트 표시
      const mealTypeLabels = {
        breakfast: "조식",
        lunch: "중식",
        dinner: "석식",
      } as const;
      toast.success(
        variables.mealType
          ? `${mealTypeLabels[variables.mealType]} 기록이 삭제되었습니다.`
          : "식대 기록이 삭제되었습니다.",
      );

      // 관련 쿼리 무효화
      const date = new Date(variables.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // 식사 데이터 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.meals.byUserAndMonth(variables.userName, month, year)
      });
      queryClient.invalidateQueries({
        queryKey: ["meals", "recentActivity"]
      });

      // 계산 데이터도 무효화 (식사 금액이 바뀌면 계산도 영향을 받음)
      queryClient.invalidateQueries({
        queryKey: queryKeys.calculation.byUserAndMonth(variables.userName, month, year)
      });

      // 식대 통계 쿼리 무효화 (userId 기반)
      if (variables.userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.mealStats.byUserAndMonth(variables.userId, month, year)
        });
      }

      console.log("Delete result:", data);
    },
    onError: (error, _variables, context) => {
      // 로딩 토스트 제거
      if (context?.loadingToast) {
        toast.dismiss(context.loadingToast);
      }

      // 에러 토스트 표시
      toast.error("식대 기록을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");

      console.error("Meal delete error:", error);
    },
  });
}
