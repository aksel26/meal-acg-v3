// Excel 처리 관련 공통 타입 정의

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

export interface CalculationResult {
  workDays: number;
  holidayWorkDays: number;
  vacationDays: number;
  availableAmount: number;
  totalUsed: number;
  balance: number;
}

export interface MealSubmitData {
  date: Date;
  breakfast: {
    store: string;
    amount: number;
    payer: string;
  };
  lunch: {
    store: string;
    amount: number;
    payer: string;
    attendance: string;
  };
  dinner: {
    store: string;
    amount: number;
    payer: string;
  };
}

export interface HolidayData {
  name: string;
  date: string;
}

export interface ExcelHolidayInfo {
  rowIndex: number;
  date: string;
  name: string;
}

export interface CellInfo {
  cellAddress: string;
  sheetName: string;
  availableSheets: string[];
  value: any;
  rawValue: any;
  formattedValue: any;
  cellType: string;
}