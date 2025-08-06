import * as XLSX from "xlsx";

export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
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

export interface CalculationResult {
  workDays: number;
  holidayWorkDays: number;
  vacationDays: number;
  availableAmount: number;
  totalUsed: number;
  balance: number;
}

export async function processExcelBuffer(
  buffer: Buffer, 
  targetMonth: number, 
  targetYear?: number, 
  targetDay?: number,
  operation: "calculation" | "meals" = "calculation"
): Promise<CalculationResult | MealData[]> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  
  const targetSheetName = workbook.SheetNames.includes("내역") ? "내역" : workbook.SheetNames[0];
  
  if (!targetSheetName) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  const worksheet = workbook.Sheets[targetSheetName];
  
  if (!worksheet) {
    throw new Error(`시트 '${targetSheetName}'를 찾을 수 없습니다.`);
  }

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "B3:R204" });

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
    return extractMealData(jsonData, targetYear || new Date().getFullYear(), targetMonth, targetDay);
  }
}

function calculateFromData(jsonData: any[], targetMonth: number): CalculationResult {
  let workDays = 0;
  let holidayWorkDays = 0;
  let vacationDays = 0;
  let totalUsed = 0;

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    const month = parseInt(row[1]) || 0;

    if (month === targetMonth) {
      const workType = row[4] || "";
      const attendance = row[6] || "";
      const amount = parseFloat(row[8]) || 0;

      if (workType.includes("업무일")) {
        workDays++;
      }

      if (workType.includes("휴일") && attendance.includes("근무")) {
        holidayWorkDays++;
      }

      if (attendance.includes("휴무")) {
        vacationDays++;
      }

      totalUsed += amount;
    }
  }

  const availableAmount = workDays * 10000 + holidayWorkDays * 10000 - vacationDays * 10000;
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

function extractMealData(jsonData: any[], targetYear: number, targetMonth: number, targetDay?: number): MealData[] {
  const mealData: MealData[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    const year = parseInt(row[0]) || 0;
    const month = parseInt(row[1]) || 0;
    const day = parseInt(row[2]) || 0;

    if (year === targetYear && month === targetMonth && (targetDay === undefined || day === targetDay)) {
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

export async function readCellFromBuffer(buffer: Buffer, cellAddress: string, sheetName?: string): Promise<any> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  
  const targetSheetName = sheetName && workbook.SheetNames.includes(sheetName) ? sheetName : workbook.SheetNames[0];

  if (!targetSheetName) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error(`시트 '${targetSheetName}'를 찾을 수 없습니다.`);
  }

  const cell = worksheet[cellAddress];
  const cellValue = cell ? cell.v : null;
  const formattedValue = cell ? cell.w || cell.v : null;

  return {
    cellAddress,
    sheetName: targetSheetName,
    availableSheets: workbook.SheetNames,
    value: cellValue,
    rawValue: cellValue,
    formattedValue: formattedValue,
    cellType: cell ? cell.t : null,
  };
}

export interface MealSubmitData {
  date: Date;
  mealType: "breakfast" | "lunch" | "dinner";
  attendance: string;
  store: string;
  amount: number;
  payer: string;
}

export async function updateExcelMealData(buffer: Buffer, mealData: MealSubmitData): Promise<Buffer> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  
  const targetSheetName = workbook.SheetNames.includes("내역") ? "내역" : workbook.SheetNames[0];
  
  if (!targetSheetName) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error(`시트 '${targetSheetName}'를 찾을 수 없습니다.`);
  }

  // 데이터 범위 B3:R204에서 해당 날짜 찾기
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "B3:R204" });
  
  const targetYear = mealData.date.getFullYear();
  const targetMonth = mealData.date.getMonth() + 1;
  const targetDay = mealData.date.getDate();

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
    throw new Error(`${targetYear}-${targetMonth}-${targetDay} 날짜의 행을 찾을 수 없습니다.`);
  }

  console.log(`Found target row: ${rowIndex} for date ${targetYear}-${targetMonth}-${targetDay}`);

  // 근태 정보는 항상 H열에 입력 (중식, 석식, 조식 공통)
  const attendanceCell = `H${rowIndex}`;
  worksheet[attendanceCell] = { v: mealData.attendance, t: "s" };

  // 식사 유형별 열 매핑
  let storeCell: string;
  let amountCell: string;
  let payerCell: string;

  switch (mealData.mealType) {
    case "lunch":
      storeCell = `I${rowIndex}`; // I열 - 상호명
      amountCell = `J${rowIndex}`; // J열 - 금액
      payerCell = `L${rowIndex}`; // L열 - 비고(결제자)
      break;
    case "dinner":
      storeCell = `M${rowIndex}`; // M열 - 상호명
      amountCell = `N${rowIndex}`; // N열 - 금액
      payerCell = `O${rowIndex}`; // O열 - 비고(결제자)
      break;
    case "breakfast":
      storeCell = `P${rowIndex}`; // P열 - 상호명
      amountCell = `Q${rowIndex}`; // Q열 - 금액
      payerCell = `R${rowIndex}`; // R열 - 비고(결제자)
      break;
    default:
      throw new Error(`지원하지 않는 식사 유형: ${mealData.mealType}`);
  }

  // 각 셀에 데이터 입력 (빈 문자열도 그대로 입력)
  worksheet[storeCell] = { v: mealData.store, t: "s" };
  worksheet[amountCell] = mealData.amount > 0 ? { v: mealData.amount, t: "n" } : { v: "", t: "s" };
  worksheet[payerCell] = { v: mealData.payer, t: "s" };

  console.log(`Updated cells: ${attendanceCell}=${mealData.attendance}, ${storeCell}=${mealData.store}, ${amountCell}=${mealData.amount}, ${payerCell}=${mealData.payer}`);

  // 업데이트된 워크북을 Buffer로 변환
  const updatedBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  
  return Buffer.from(updatedBuffer);
}