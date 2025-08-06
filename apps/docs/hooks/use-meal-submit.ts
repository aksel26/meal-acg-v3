import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

interface MealSubmitData {
  userName: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
  attendance: string;
  store: string;
  amount: string;
  payer: string;
}

interface MealSubmitResponse {
  success: boolean;
  message: string;
  data: {
    fileName: string;
    date: string;
    mealType: string;
    updatedData: any;
  };
}

async function submitMealData(data: MealSubmitData): Promise<MealSubmitResponse> {
  const response = await fetch("/api/meals/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.details || errorData.error || "식사 기록 저장에 실패했습니다.");
  }

  return response.json();
}

export function useMealSubmit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitMealData,
    onMutate: (variables) => {
      // 로딩 토스트 표시
      const mealTypeKorean = 
        variables.mealType === "breakfast" ? "조식" : 
        variables.mealType === "lunch" ? "중식" : "석식";
      
      const loadingToast = toast.loading(`${mealTypeKorean} 기록을 저장하는 중...`);
      
      // 토스트 ID를 반환해서 나중에 제거할 수 있도록 함
      return { loadingToast };
    },
    onSuccess: (data, variables, context) => {
      // 로딩 토스트 제거
      if (context?.loadingToast) {
        toast.dismiss(context.loadingToast);
      }

      // 성공 토스트 표시
      const mealTypeKorean = 
        variables.mealType === "breakfast" ? "조식" : 
        variables.mealType === "lunch" ? "중식" : "석식";
      
      toast.success(`${mealTypeKorean} 기록이 저장되었습니다.`);

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

      console.log("Submit result:", data);
    },
    onError: (error, variables, context) => {
      // 로딩 토스트 제거
      if (context?.loadingToast) {
        toast.dismiss(context.loadingToast);
      }

      // 에러 토스트 표시
      const mealTypeKorean = 
        variables.mealType === "breakfast" ? "조식" : 
        variables.mealType === "lunch" ? "중식" : "석식";
      
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(`${mealTypeKorean} 기록 저장에 실패했습니다: ${errorMessage}`);

      console.error("Form submit error:", error);
    },
  });
}