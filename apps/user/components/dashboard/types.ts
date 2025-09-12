export interface CalculationData {
  fileName: string;
  month: number;
  workDays: number;
  holidayWorkDays: number;
  vacationDays: number;
  availableAmount: number;
  totalUsed: number;
  balance: number;
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