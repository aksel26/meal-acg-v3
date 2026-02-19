import * as XLSX from "xlsx";

export interface PointsUsageRow {
  rowIndex: number;
  no: number | null;
  name: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: string;
  type: "활동비" | "복지포인트";
  description: string;
  amount: number;
  pncCheck: string | null;
  notes: string | null;
  usedAt: string; // YYYY-MM-DD
  validationErrors: string[];
}

export interface PointsParseResult {
  success: boolean;
  rows: PointsUsageRow[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

// 실제 Excel 구조 ("Raw data" 시트):
// Row 0: 타이틀, Row 1: 부제, Row 2: 헤더 → 데이터는 Row 3부터
// A=0(No.), B=1(이름), C=2(연도), D=3(월), E=4(일), F=5(요일),
// G=6(활동비/복지포인트 유형), H=7(사유), I=8(금액), J=9(P&C팀 확인), K=10(타인 카드 사용 시)
const COLUMNS = {
  NO: 0,          // A
  NAME: 1,        // B
  YEAR: 2,        // C
  MONTH: 3,       // D
  DAY: 4,         // E
  DAY_OF_WEEK: 5, // F
  TYPE: 6,        // G
  DESCRIPTION: 7, // H (사유)
  AMOUNT: 8,      // I
  PNC_CHECK: 9,   // J
  OTHER_CARD: 10, // K (타인 카드 사용 시)
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

const VALID_TYPES = ["활동비", "복지포인트"] as const;

export function parsePointsExcelFile(buffer: ArrayBuffer): PointsParseResult {
  const errors: string[] = [];
  const rows: PointsUsageRow[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: "array" });

    // "Raw data" 시트 찾기
    const sheetName = workbook.SheetNames.find(
      (name) => name === "Raw data" || name.includes("Raw")
    ) || workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        rows: [],
        errors: ["시트를 찾을 수 없습니다."],
        totalRows: 0,
        validRows: 0,
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return {
        success: false,
        rows: [],
        errors: ["시트를 읽을 수 없습니다."],
        totalRows: 0,
        validRows: 0,
      };
    }

    const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: null,
    });

    // Row 0: 타이틀, Row 1: 부제, Row 2: 헤더 → 데이터는 Row 3부터
    const DATA_START_ROW = 3;

    for (let i = DATA_START_ROW; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !Array.isArray(row)) continue;

      const validationErrors: string[] = [];

      // No. (컬럼 A) - Excel 시트의 순서번호
      const noRaw = row[COLUMNS.NO];
      let no: number | null = null;
      if (typeof noRaw === "number") {
        no = noRaw;
      } else if (noRaw) {
        const parsed = parseInt(String(noRaw), 10);
        no = isNaN(parsed) ? null : parsed;
      }

      // 디버깅: No 값 로깅 (첫 5개 행만)
      if (i - DATA_START_ROW < 5) {
        console.log(`Row ${i - DATA_START_ROW + 1}: noRaw=${noRaw}, no=${no}`);
      }

      // 이름
      const name = getCellValue(row, COLUMNS.NAME);
      if (!name || name.length < 2) {
        // No.(0)와 연도(2) 외에 데이터가 없으면 빈 행으로 건너뜀
        const SKIP_COLS = new Set([0, COLUMNS.YEAR]);
        const hasData = row.some((cell, idx) => !SKIP_COLS.has(idx) && cell !== null && cell !== "");
        if (!hasData) continue;
        if (!name) {
          validationErrors.push("이름이 비어있습니다");
        } else {
          validationErrors.push("이름은 2글자 이상이어야 합니다");
        }
      }

      // 날짜
      const year = parseAmount(row[COLUMNS.YEAR]);
      const month = parseAmount(row[COLUMNS.MONTH]);
      const day = parseAmount(row[COLUMNS.DAY]);

      if (year === null || month === null || day === null) {
        validationErrors.push("날짜 정보가 누락되었습니다");
      } else if (!isValidDate(year, month, day)) {
        validationErrors.push(`유효하지 않은 날짜 (${year}-${month}-${day})`);
      }

      // 요일
      const dayOfWeek = getCellValue(row, COLUMNS.DAY_OF_WEEK) || "";

      // 유형
      const typeRaw = getCellValue(row, COLUMNS.TYPE);
      const type = typeRaw as "활동비" | "복지포인트";
      if (!typeRaw || !VALID_TYPES.includes(typeRaw as typeof VALID_TYPES[number])) {
        validationErrors.push(`유형이 올바르지 않습니다: "${typeRaw || ""}". "활동비" 또는 "복지포인트"만 허용`);
      }

      // 사용처
      const description = getCellValue(row, COLUMNS.DESCRIPTION);
      if (!description) {
        validationErrors.push("사용처가 비어있습니다");
      }

      // 금액
      const amount = parseAmount(row[COLUMNS.AMOUNT]);
      if (amount === null || amount <= 0) {
        validationErrors.push(`금액이 올바르지 않습니다: "${row[COLUMNS.AMOUNT] ?? ""}"`);
      }

      // P&C 확인 (선택)
      const pncCheck = getCellValue(row, COLUMNS.PNC_CHECK);

      // 타인 카드 사용 시 (선택) → notes로 저장
      const notes = getCellValue(row, COLUMNS.OTHER_CARD);

      // usedAt 계산
      const usedAt =
        year !== null && month !== null && day !== null && isValidDate(year, month, day)
          ? formatDate(year, month, day)
          : "";

      rows.push({
        rowIndex: i - DATA_START_ROW + 1, // 1-based from data start
        no: no ?? null,
        name: name || "",
        year: year || 0,
        month: month || 0,
        day: day || 0,
        dayOfWeek,
        type: VALID_TYPES.includes(type as typeof VALID_TYPES[number]) ? type : "활동비",
        description: description || "",
        amount: amount || 0,
        pncCheck,
        notes,
        usedAt,
        validationErrors,
      });
    }

    const validRows = rows.filter((r) => r.validationErrors.length === 0).length;

    return {
      success: true,
      rows,
      errors,
      totalRows: rows.length,
      validRows,
    };
  } catch (error) {
    return {
      success: false,
      rows: [],
      errors: [`파일 파싱 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`],
      totalRows: 0,
      validRows: 0,
    };
  }
}
