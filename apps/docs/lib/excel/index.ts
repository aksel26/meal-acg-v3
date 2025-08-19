// Excel 처리 라이브러리 통합 엔트리 포인트

// 타입 정의
export * from "../types/excel-types";

// 기본 Excel 처리 함수
export {
  streamToBuffer,
  readCellFromBuffer,
  extractDataFromWorksheet,
  columnToIndex,
  indexToColumn,
  getWorksheet,
} from "./excel-core";

// 식사 데이터 처리 함수
export {
  processExcelBuffer,
  updateExcelMealData,
} from "./meal-processor";

// 공휴일 처리 함수
export {
  getHolidaysFromExcel,
  updateExcelHolidays,
  fetchGoogleHolidays,
} from "./holiday-processor";

// 기존 파일과의 호환성을 위한 Re-export
// 기존 excel-processor.ts를 사용하던 코드들이 계속 작동하도록 함
export type {
  MealData,
  CalculationResult,
  MealSubmitData,
  HolidayData,
  ExcelHolidayInfo,
  CellInfo,
} from "../types/excel-types";