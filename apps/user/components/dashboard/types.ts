export interface CalculationData {
  allowanceAmount: number; // 실제 사용가능 금액 (개별식사 차감 후)
  originalAllowance?: number; // 원래 월별 지원금
  totalUsed: number;
  balance: number;
  mealCount: number;
  individualMealCount?: number; // 개별식사 수
  individualMealDeduction?: number; // 개별식사 차감액
  dailyAllowance?: number; // 일일 지원금
}

export interface MealData {
  date: string;
  attendance: string;
  lunch?: {
    store: string;
    amount: number;
    payer: string;
  };
  dinner?: {
    store: string;
    amount: number;
    payer: string;
  };
  breakfast?: {
    store: string;
    amount: number;
    payer: string;
  };
}

export interface FormData {
  breakfast: {
    payer: string;
    store: string;
    amount: string;
  };
  lunch: {
    payer: string;
    store: string;
    amount: string;
    attendance: string;
  };
  dinner: {
    payer: string;
    store: string;
    amount: string;
  };
}