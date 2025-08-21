import * as ExcelJS from "exceljs";

export interface HolidayData {
  name: string;
  date: string;
}

export interface ExcelHolidayInfo {
  rowIndex: number;
  date: string;
  name: string;
}

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
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const targetSheetName = workbook.worksheets.find((ws) => ws.name === "내역")?.name || workbook.worksheets[0]?.name;

  if (!targetSheetName) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  const worksheet = workbook.getWorksheet(targetSheetName);

  if (!worksheet) {
    throw new Error(`시트 '${targetSheetName}'를 찾을 수 없습니다.`);
  }

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
    return extractMealData(jsonData, targetYear || new Date().getFullYear(), targetMonth, targetDay);
  }
}

function calculateFromData(jsonData: any[], targetMonth: number): CalculationResult {
  let workDays = 0;
  let holidayWorkDays = 0;
  let vacationDays = 0;
  let individualCount = 0;
  let totalUsed = 0;

  console.log("=== DEBUG: calculateFromData ===");
  console.log("Target month:", targetMonth);
  console.log("Total rows:", jsonData.length);
  console.log("First few rows:", jsonData.slice(0, 5));

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;

    const month = parseInt(row[1]) || 0;

    if (month === targetMonth) {
      console.log(`=== Row ${i + 3} (month ${month}) ===`);
      // console.log("Full row:", row);
      console.log("Row length:", row.length);

      const workType = row[4] || "";
      const attendance = row[6] || "";
      const amount = parseFloat(row[8]) || 0;

      console.log("workType (index 4):", workType);
      console.log("attendance (index 6):", attendance);
      console.log("amount (index 8):", amount);

      // workType이 객체인 경우와 문자열인 경우 모두 처리
      const workTypeText = typeof workType === "object" && workType?.result ? workType.result : String(workType || "");
      
      // attendance도 객체인 경우와 문자열인 경우 모두 처리
      const attendanceText = typeof attendance === "object" && attendance?.result ? attendance.result : String(attendance || "");

      if (workTypeText.includes("업무일")) {
        workDays++;
        console.log("→ 업무일 카운트:", workDays);
      }

      if (workTypeText.includes("휴일") && attendanceText.includes("근무")) {
        holidayWorkDays++;
        console.log("→ 휴일근무 카운트:", holidayWorkDays);
      }

      if (attendanceText.includes("휴무")) {
        vacationDays++;
        console.log("→ 휴무 카운트:", vacationDays);
      }

      if (attendanceText.includes("개별")) {
        individualCount++;
        console.log("→ 개별 카운트:", individualCount);
      }

      totalUsed += amount;
      console.log("→ 누적 사용금액:", totalUsed);
    }
  }

  const availableAmount = workDays * 10000 + holidayWorkDays * 10000 - vacationDays * 10000 - individualCount * 10000;
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
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const targetWorksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];

  if (!targetWorksheet) {
    throw new Error(sheetName ? `시트 '${sheetName}'를 찾을 수 없습니다.` : "시트를 찾을 수 없습니다.");
  }

  const cell = targetWorksheet.getCell(cellAddress);
  const cellValue = cell.value;
  const formattedValue = cell.text || cell.value;

  return {
    cellAddress,
    sheetName: targetWorksheet.name,
    availableSheets: workbook.worksheets.map((ws) => ws.name),
    value: cellValue,
    rawValue: cellValue,
    formattedValue: formattedValue,
    cellType: typeof cellValue,
  };
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

export async function updateExcelMealData(buffer: Buffer, mealData: MealSubmitData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const targetSheetName = workbook.worksheets.find((ws) => ws.name === "내역")?.name || workbook.worksheets[0]?.name;

  if (!targetSheetName) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  const worksheet = workbook.getWorksheet(targetSheetName);
  if (!worksheet) {
    throw new Error(`시트 '${targetSheetName}'를 찾을 수 없습니다.`);
  }

  // 데이터 범위 B3:R204에서 해당 날짜 찾기
  const jsonData = extractDataFromWorksheet(worksheet, "B3:R204");

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

  // 근태 정보는 H열에 입력 (lunch 데이터에서 가져옴)
  const attendanceCell = worksheet.getCell(`H${rowIndex}`);
  attendanceCell.value = mealData.lunch.attendance;

  // 조식 데이터 입력 (P, Q, R열)
  if (mealData.breakfast.store || mealData.breakfast.amount || mealData.breakfast.payer) {
    const breakfastStoreCellObj = worksheet.getCell(`P${rowIndex}`);
    breakfastStoreCellObj.value = mealData.breakfast.store;

    const breakfastAmountCellObj = worksheet.getCell(`Q${rowIndex}`);
    breakfastAmountCellObj.value = mealData.breakfast.amount > 0 ? mealData.breakfast.amount : "";

    const breakfastPayerCellObj = worksheet.getCell(`R${rowIndex}`);
    breakfastPayerCellObj.value = mealData.breakfast.payer;
  }

  // 중식 데이터 입력 (I, J, L열)
  if (mealData.lunch.store || mealData.lunch.amount || mealData.lunch.payer) {
    const lunchStoreCellObj = worksheet.getCell(`I${rowIndex}`);
    lunchStoreCellObj.value = mealData.lunch.store;

    const lunchAmountCellObj = worksheet.getCell(`J${rowIndex}`);
    lunchAmountCellObj.value = mealData.lunch.amount > 0 ? mealData.lunch.amount : "";

    const lunchPayerCellObj = worksheet.getCell(`L${rowIndex}`);
    lunchPayerCellObj.value = mealData.lunch.payer;
  }

  // 석식 데이터 입력 (M, N, O열)
  if (mealData.dinner.store || mealData.dinner.amount || mealData.dinner.payer) {
    const dinnerStoreCellObj = worksheet.getCell(`M${rowIndex}`);
    dinnerStoreCellObj.value = mealData.dinner.store;

    const dinnerAmountCellObj = worksheet.getCell(`N${rowIndex}`);
    dinnerAmountCellObj.value = mealData.dinner.amount > 0 ? mealData.dinner.amount : "";

    const dinnerPayerCellObj = worksheet.getCell(`O${rowIndex}`);
    dinnerPayerCellObj.value = mealData.dinner.payer;
  }

  console.log(
    `Updated cells for ${targetYear}-${targetMonth}-${targetDay}:`,
    `H${rowIndex}=${mealData.lunch.attendance}`,
    `Breakfast: P${rowIndex}=${mealData.breakfast.store}, Q${rowIndex}=${mealData.breakfast.amount}, R${rowIndex}=${mealData.breakfast.payer}`,
    `Lunch: I${rowIndex}=${mealData.lunch.store}, J${rowIndex}=${mealData.lunch.amount}, L${rowIndex}=${mealData.lunch.payer}`,
    `Dinner: M${rowIndex}=${mealData.dinner.store}, N${rowIndex}=${mealData.dinner.amount}, O${rowIndex}=${mealData.dinner.payer}`
  );

  // 업데이트된 워크북을 Buffer로 변환
  const updatedBuffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(updatedBuffer);
}

// Helper function to extract data from worksheet in the format expected by existing code
function extractDataFromWorksheet(worksheet: ExcelJS.Worksheet, range: string): any[][] {
  console.log("=== DEBUG: extractDataFromWorksheet ===");
  console.log("Range:", range);
  console.log("Worksheet name:", worksheet.name);

  const result: any[][] = [];
  const [startRange, endRange] = range.split(":");
  if (!startRange || !endRange) {
    throw new Error(`Invalid range format: ${range}`);
  }

  const startCol = startRange.match(/[A-Z]+/)?.[0] || "A";
  const startRow = parseInt(startRange.match(/\d+/)?.[0] || "1");
  const endCol = endRange.match(/[A-Z]+/)?.[0] || "Z";
  const endRow = parseInt(endRange.match(/\d+/)?.[0] || "1");

  const colStart = columnToIndex(startCol);
  const colEnd = columnToIndex(endCol);

  for (let rowNum = startRow; rowNum <= Math.min(startRow + 10, endRow); rowNum++) {
    // 처음 10행만 디버깅
    const row: any[] = [];
    for (let colNum = colStart; colNum <= colEnd; colNum++) {
      const col = indexToColumn(colNum);
      const cell = worksheet.getCell(`${col}${rowNum}`);
      row.push(cell.value || null);
    }
    result.push(row);

    if (rowNum <= startRow + 3) {
      // 처음 몇 행만 출력
      // console.log(`Row ${rowNum}:`, row.slice(0, 10), "..."); // 처음 10개 컬럼만 출력
    }
  }

  // 나머지 행들은 로그 없이 처리
  for (let rowNum = Math.min(startRow + 11, endRow); rowNum <= endRow; rowNum++) {
    const row: any[] = [];
    for (let colNum = colStart; colNum <= colEnd; colNum++) {
      const col = indexToColumn(colNum);
      const cell = worksheet.getCell(`${col}${rowNum}`);
      row.push(cell.value || null);
    }
    result.push(row);
  }

  console.log(`Total rows extracted: ${result.length}`);
  return result;
}

// Helper functions for column conversion
function columnToIndex(column: string): number {
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 64);
  }
  return result - 1;
}

function indexToColumn(index: number): string {
  let result = "";
  index++;
  while (index > 0) {
    index--;
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26);
  }
  return result;
}

// 엑셀에서 현재 월의 공휴일 정보 추출 (F열='휴일', G열에 값이 있는 경우)
export async function getHolidaysFromExcel(buffer: Buffer, targetMonth: number, targetYear?: number): Promise<ExcelHolidayInfo[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const targetSheetName = workbook.worksheets.find((ws) => ws.name === "내역")?.name || workbook.worksheets[0]?.name;

  if (!targetSheetName) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  const worksheet = workbook.getWorksheet(targetSheetName);
  if (!worksheet) {
    throw new Error(`시트 '${targetSheetName}'를 찾을 수 없습니다.`);
  }

  const jsonData = extractDataFromWorksheet(worksheet, "B3:R204");
  const holidays: ExcelHolidayInfo[] = [];
  const currentYear = targetYear || new Date().getFullYear();

  console.log(`=== Extracting holidays for ${currentYear}-${targetMonth} ===`);

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;

    const year = parseInt(row[0]) || 0; // B열 (연도)
    const month = parseInt(row[1]) || 0; // C열 (월)
    const day = parseInt(row[2]) || 0; // D열 (일)
    const workType = row[4] || ""; // F열 (근무구분)
    const holidayName = row[5] || ""; // G열 (공휴일명)

    // 해당 년도와 월에 해당하고, F열이 '휴일'이며, G열에 값이 있는 경우
    if (year === currentYear && month === targetMonth && String(workType).includes("휴일") && holidayName) {
      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      holidays.push({
        rowIndex: i + 3, // B3부터 시작하므로 +3
        date: dateString,
        name: String(holidayName),
      });

      console.log(`Found holiday: ${dateString} - ${holidayName} (row ${i + 3})`);
    }
  }

  console.log(`Total holidays found in Excel: ${holidays.length}`);
  return holidays;
}

// 구글 캘린더 공휴일과 엑셀 공휴일 비교 후 업데이트
export async function updateExcelHolidays(buffer: Buffer, googleHolidays: HolidayData[], targetMonth: number, targetYear?: number): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const targetSheetName = workbook.worksheets.find((ws) => ws.name === "내역")?.name || workbook.worksheets[0]?.name;

  if (!targetSheetName) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  const worksheet = workbook.getWorksheet(targetSheetName);
  if (!worksheet) {
    throw new Error(`시트 '${targetSheetName}'를 찾을 수 없습니다.`);
  }

  // 현재 엑셀의 공휴일 정보 가져오기
  const excelHolidays = await getHolidaysFromExcel(buffer, targetMonth, targetYear);

  console.log(`=== Holiday Comparison ===`);
  console.log(`Google Calendar holidays: ${googleHolidays.length}`);
  console.log(`Excel holidays: ${excelHolidays.length}`);

  // 공휴일 수가 일치하지 않으면 업데이트 진행
  if (googleHolidays.length !== excelHolidays.length) {
    console.log("Holiday counts don't match. Updating Excel...");

    const jsonData = extractDataFromWorksheet(worksheet, "B3:R204");
    const currentYear = targetYear || new Date().getFullYear();

    // 구글 캘린더의 각 공휴일에 대해 엑셀 업데이트
    for (const googleHoliday of googleHolidays) {
      const holidayDate = new Date(googleHoliday.date);
      const year = holidayDate.getFullYear();
      const month = holidayDate.getMonth() + 1;
      const day = holidayDate.getDate();

      // 해당 날짜가 이미 엑셀에 공휴일로 등록되어 있는지 확인
      const existingHoliday = excelHolidays.find((h) => h.date === googleHoliday.date);

      if (!existingHoliday && year === currentYear && month === targetMonth) {
        // 해당 날짜의 행 찾기
        let rowIndex = -1;
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          const rowYear = parseInt(row[0]) || 0;
          const rowMonth = parseInt(row[1]) || 0;
          const rowDay = parseInt(row[2]) || 0;

          if (rowYear === year && rowMonth === month && rowDay === day) {
            rowIndex = i + 3; // B3부터 시작하므로 +3
            break;
          }
        }

        if (rowIndex !== -1) {
          console.log(`Updating row ${rowIndex} for ${googleHoliday.date} - ${googleHoliday.name}`);

          // F열에 '휴일' 설정 (빨간색 배경)
          const workTypeCell = worksheet.getCell(`F${rowIndex}`);
          workTypeCell.value = "휴일";
          workTypeCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFF0000" }, // 빨간색 배경
          };

          // G열에 공휴일 이름 설정 (빨간색 텍스트)
          const holidayNameCell = worksheet.getCell(`G${rowIndex}`);
          holidayNameCell.value = googleHoliday.name;
          holidayNameCell.font = {
            color: { argb: "FFFF0000" }, // 빨간색 텍스트
          };

          console.log(`Updated: F${rowIndex}='휴일', G${rowIndex}='${googleHoliday.name}'`);
        } else {
          console.log(`Row not found for date: ${googleHoliday.date}`);
        }
      }
    }
  } else {
    console.log("Holiday counts match. No update needed.");
  }

  // 업데이트된 워크북을 Buffer로 변환
  const updatedBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(updatedBuffer);
}

// 구글 캘린더 API에서 공휴일 데이터 가져오기
export async function fetchGoogleHolidays(month: number): Promise<HolidayData[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/holidays?month=${month}`);
    console.log("response:", response);

    if (!response.ok) {
      throw new Error(`Failed to fetch holidays: ${response.statusText}`);
    }

    const holidays = await response.json();
    return holidays as HolidayData[];
  } catch (error) {
    console.error("Error fetching Google holidays:", error);
    throw error;
  }
}
