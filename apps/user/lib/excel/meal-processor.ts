import {
  MealData,
  CalculationResult,
  MealSubmitData,
} from "../types/excel-types";
import { getWorksheet, extractDataFromWorksheet } from "./excel-core";
import dayjs from "dayjs";

// 데이터에서 계산 수행
function calculateFromData(
  jsonData: any[],
  targetMonth: number
): CalculationResult {
  let workDays = 0;
  let holidayWorkDays = 0;
  let vacationDays = 0;
  let totalUsed = 0;

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;

    const month = parseInt(row[1]) || 0;

    if (month === targetMonth) {
      const workType = row[4] || "";
      const attendance = row[6] || "";
      const amount = parseFloat(row[8]) || 0;

      // workType이 객체인 경우와 문자열인 경우 모두 처리
      const workTypeText =
        typeof workType === "object" && workType?.result
          ? workType.result
          : String(workType || "");

      if (workTypeText.includes("업무일")) {
        workDays++;
      }

      if (workTypeText.includes("휴일") && attendance.includes("근무")) {
        holidayWorkDays++;
      }

      if (attendance.includes("휴무")) {
        vacationDays++;
      }

      totalUsed += amount;
    }
  }

  const availableAmount =
    workDays * 10000 + holidayWorkDays * 10000 - vacationDays * 10000;
  const balance = availableAmount - totalUsed;

  return {
    workDays,
    holidayWorkDays,
    vacationDays,
    availableAmount,
    totalUsed,
    balance,
  };
}

// 식사 데이터 추출
function extractMealData(
  jsonData: any[],
  targetYear: number,
  targetMonth: number,
  targetDay?: number
): MealData[] {
  const mealData: MealData[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    const year = parseInt(row[0]) || 0;
    const month = parseInt(row[1]) || 0;
    const day = parseInt(row[2]) || 0;

    if (
      year === targetYear &&
      month === targetMonth &&
      (targetDay === undefined || day === targetDay)
    ) {
      const attendance = row[6] || "";
      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const meal: MealData = {
        date: dateString,
        attendance: attendance,
      };

      // 중식 데이터 (I, J, L열)
      const lunchStore = row[7] || "";
      const lunchAmount = parseFloat(row[8]) || 0;
      const lunchPayer = row[10] || "";
      if (lunchStore || lunchAmount || lunchPayer) {
        meal.lunch = {
          store: lunchStore,
          amount: lunchAmount,
          payer: lunchPayer,
        };
      }

      // 석식 데이터 (M, N, O열)
      const dinnerStore = row[11] || "";
      const dinnerAmount = parseFloat(row[12]) || 0;
      const dinnerPayer = row[13] || "";
      if (dinnerStore || dinnerAmount || dinnerPayer) {
        meal.dinner = {
          store: dinnerStore,
          amount: dinnerAmount,
          payer: dinnerPayer,
        };
      }

      // 조식 데이터 (P, Q, R열)
      const breakfastStore = row[14] || "";
      const breakfastAmount = parseFloat(row[15]) || 0;
      const breakfastPayer = row[16] || "";
      if (breakfastStore || breakfastAmount || breakfastPayer) {
        meal.breakfast = {
          store: breakfastStore,
          amount: breakfastAmount,
          payer: breakfastPayer,
        };
      }

      mealData.push(meal);
    }
  }

  return mealData;
}

// Excel 버퍼 처리 (계산 또는 식사 데이터)
export async function processExcelBuffer(
  buffer: Buffer,
  targetMonth: number,
  targetYear?: number,
  targetDay?: number,
  operation: "calculation" | "meals" = "calculation"
): Promise<CalculationResult | MealData[]> {
  const { worksheet } = await getWorksheet(buffer);
  const jsonData = extractDataFromWorksheet(worksheet, "B3:R204");

  if (!jsonData || jsonData.length <= 1) {
    if (operation === "calculation") {
      return {
        workDays: 0,
        holidayWorkDays: 0,
        vacationDays: 0,
        availableAmount: 0,
        totalUsed: 0,
        balance: 0,
      };
    } else {
      return [];
    }
  }

  if (operation === "calculation") {
    return calculateFromData(jsonData, targetMonth);
  } else {
    return extractMealData(
      jsonData,
      targetYear || new Date().getFullYear(),
      targetMonth,
      targetDay
    );
  }
}

// 식사 데이터 업데이트
export async function updateExcelMealData(
  buffer: Buffer,
  mealData: MealSubmitData
): Promise<Buffer> {
  const { workbook, worksheet } = await getWorksheet(buffer);

  // 데이터 범위 B3:R204에서 해당 날짜 찾기
  const jsonData = extractDataFromWorksheet(worksheet, "B3:R204");

  const targetDate = dayjs(mealData.date);
  const targetYear = targetDate.year();
  const targetMonth = targetDate.month() + 1;
  const targetDay = targetDate.date();

  let rowIndex = -1;

  // 해당 날짜의 행 찾기
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    const year = parseInt(row[0]) || 0; // B열 (연도)
    const month = parseInt(row[1]) || 0; // C열 (월)
    const day = parseInt(row[2]) || 0; // D열 (일)

    if (year === targetYear && month === targetMonth && day === targetDay) {
      rowIndex = i + 3; // B3부터 시작하므로 +3
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(
      `${targetYear}-${targetMonth}-${targetDay} 날짜의 행을 찾을 수 없습니다.`
    );
  }

  // 근태 정보는 H열에 입력 (lunch 데이터에서 가져옴)
  const attendanceCell = worksheet.getCell(`H${rowIndex}`);
  attendanceCell.value = mealData.lunch.attendance;

  // 조식 데이터 입력 (P, Q, R열) - 항상 업데이트하여 빈 값도 반영
  const breakfastStoreCellObj = worksheet.getCell(`P${rowIndex}`);
  breakfastStoreCellObj.value = mealData.breakfast.store || "";

  const breakfastAmountCellObj = worksheet.getCell(`Q${rowIndex}`);
  breakfastAmountCellObj.value =
    mealData.breakfast.amount > 0 ? mealData.breakfast.amount : "";

  const breakfastPayerCellObj = worksheet.getCell(`R${rowIndex}`);
  breakfastPayerCellObj.value = mealData.breakfast.payer || "";

  // 중식 데이터 입력 (I, J, L열) - 항상 업데이트하여 빈 값도 반영
  const lunchStoreCellObj = worksheet.getCell(`I${rowIndex}`);
  lunchStoreCellObj.value = mealData.lunch.store || "";

  const lunchAmountCellObj = worksheet.getCell(`J${rowIndex}`);
  lunchAmountCellObj.value =
    mealData.lunch.amount > 0 ? mealData.lunch.amount : "";

  const lunchPayerCellObj = worksheet.getCell(`L${rowIndex}`);
  lunchPayerCellObj.value = mealData.lunch.payer || "";

  // 석식 데이터 입력 (M, N, O열) - 항상 업데이트하여 빈 값도 반영
  const dinnerStoreCellObj = worksheet.getCell(`M${rowIndex}`);
  dinnerStoreCellObj.value = mealData.dinner.store || "";

  const dinnerAmountCellObj = worksheet.getCell(`N${rowIndex}`);
  dinnerAmountCellObj.value =
    mealData.dinner.amount > 0 ? mealData.dinner.amount : "";

  const dinnerPayerCellObj = worksheet.getCell(`O${rowIndex}`);
  dinnerPayerCellObj.value = mealData.dinner.payer || "";

  // 업데이트된 워크북을 Buffer로 변환
  const updatedBuffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(updatedBuffer);
}
