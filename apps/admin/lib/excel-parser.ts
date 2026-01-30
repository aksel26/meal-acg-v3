import * as XLSX from "xlsx";

export interface MealRecord {
  date: string; // YYYY-MM-DD
  attendance: string | null;
  lunch_store: string | null;
  lunch_amount: number | null;
  lunch_payer: string | null;
  dinner_store: string | null;
  dinner_amount: number | null;
  dinner_payer: string | null;
  breakfast_store: string | null;
  breakfast_amount: number | null;
  breakfast_payer: string | null;
}

export interface ParseResult {
  success: boolean;
  memberName: string;
  records: MealRecord[];
  errors: string[];
}

// 열 인덱스 (0-based) - Export 템플릿 기준: A열 빈 열, B열부터 데이터 시작
const COLUMNS = {
  YEAR: 1, // B
  MONTH: 2, // C
  DAY: 3, // D
  ATTENDANCE: 7, // H
  LUNCH_STORE: 8, // I
  LUNCH_AMOUNT: 9, // J
  LUNCH_PAYER: 11, // L (K열은 알림용)
  DINNER_STORE: 12, // M
  DINNER_AMOUNT: 13, // N
  DINNER_PAYER: 14, // O
  BREAKFAST_STORE: 15, // P
  BREAKFAST_AMOUNT: 16, // Q
  BREAKFAST_PAYER: 17, // R
};

function getCellValue(row: unknown[], index: number): string | null {
  const value = row[index];
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).trim();
}

function parseAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function extractMemberNameFromFileName(fileName: string): string {
  // "{이름}.xlsx" 형식에서 이름 추출
  return fileName.replace(/\.xlsx$/i, "").trim();
}

export function parseExcelFile(buffer: ArrayBuffer, fileName: string, filterCurrentMonth = true): ParseResult {
  const memberName = extractMemberNameFromFileName(fileName);
  const errors: string[] = [];
  const records: MealRecord[] = [];

  // 현재 월 필터링용
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  try {
    const workbook = XLSX.read(buffer, { type: "array" });

    // "내역" 시트 찾기
    const sheetName = workbook.SheetNames.find(
      (name) => name === "내역" || name.includes("내역")
    );

    if (!sheetName) {
      return {
        success: false,
        memberName,
        records: [],
        errors: [`'내역' 시트를 찾을 수 없습니다. (찾은 시트: ${workbook.SheetNames.join(", ")})`],
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return {
        success: false,
        memberName,
        records: [],
        errors: ["시트를 읽을 수 없습니다."],
      };
    }
    const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: null,
    });

    // 4행부터 데이터 시작 (인덱스 3)
    const DATA_START_ROW = 3;
    for (let i = DATA_START_ROW; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !Array.isArray(row)) continue;

      // 날짜 추출
      const year = parseAmount(row[COLUMNS.YEAR]);
      const month = parseAmount(row[COLUMNS.MONTH]);
      const day = parseAmount(row[COLUMNS.DAY]);

      // 날짜가 없으면 건너뜀 (빈 행)
      if (year === null || month === null || day === null) {
        // 날짜가 없어도 다른 데이터가 있으면 경고만 남기고 건너뜀
        const hasOtherData = row.some((cell, idx) => idx > COLUMNS.DAY && cell !== null && cell !== "");
        if (hasOtherData) {
          errors.push(`행 ${i + 1}: 날짜 정보 누락`);
        }
        continue;
      }

      // 날짜 유효성 검사
      if (!isValidDate(year, month, day)) {
        errors.push(`행 ${i + 1}: 유효하지 않은 날짜 (${year}-${month}-${day})`);
        continue;
      }

      // 현재 월 필터링
      if (filterCurrentMonth && (year !== currentYear || month !== currentMonth)) {
        continue;
      }

      const record: MealRecord = {
        date: formatDate(year, month, day),
        attendance: getCellValue(row, COLUMNS.ATTENDANCE),
        lunch_store: getCellValue(row, COLUMNS.LUNCH_STORE),
        lunch_amount: parseAmount(row[COLUMNS.LUNCH_AMOUNT]),
        lunch_payer: getCellValue(row, COLUMNS.LUNCH_PAYER),
        dinner_store: getCellValue(row, COLUMNS.DINNER_STORE),
        dinner_amount: parseAmount(row[COLUMNS.DINNER_AMOUNT]),
        dinner_payer: getCellValue(row, COLUMNS.DINNER_PAYER),
        breakfast_store: getCellValue(row, COLUMNS.BREAKFAST_STORE),
        breakfast_amount: parseAmount(row[COLUMNS.BREAKFAST_AMOUNT]),
        breakfast_payer: getCellValue(row, COLUMNS.BREAKFAST_PAYER),
      };

      // 날짜가 유효하면 레코드 추가 (빈 데이터도 포함)
      records.push(record);
    }

    return {
      success: true,
      memberName,
      records,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      memberName,
      records: [],
      errors: [`파일 파싱 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`],
    };
  }
}
