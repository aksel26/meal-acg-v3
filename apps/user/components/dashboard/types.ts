export interface CalculationData {
  allowanceAmount: number; // 실제 사용가능 금액 (모든 차감 후)
  originalAllowance?: number; // 원래 월별 지원금
  totalUsed: number;
  balance: number;
  mealCount: number;
  individualMealCount?: number; // 개별식사 수
  individualMealDeduction?: number; // 개별식사 차감액
  noMealFullDayCount?: number; // 연차/재택/휴무 일수
  noMealDeduction?: number; // 연차/재택/휴무 차감액
  halfDayOffCount?: number; // 반차 일수
  halfDayDeduction?: number; // 반차 차감액
  totalDeduction?: number; // 총 차감액
  dailyAllowance?: number; // 일일 지원금
}

export interface MealData {
  date: string;
  attendance: string;
  attendance_source?: "meal" | "dayoff" | "attendance";
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
