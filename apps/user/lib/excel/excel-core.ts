import * as ExcelJS from "exceljs";

// Excel 기본 처리 함수들

export async function streamToBuffer(
  stream: NodeJS.ReadableStream
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function readCellFromBuffer(
  buffer: Buffer,
  cellAddress: string,
  sheetName?: string
): Promise<any> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const targetWorksheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0];

  if (!targetWorksheet) {
    throw new Error(
      sheetName
        ? `시트 '${sheetName}'를 찾을 수 없습니다.`
        : "시트를 찾을 수 없습니다."
    );
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

// Helper function to extract data from worksheet
export function extractDataFromWorksheet(
  worksheet: ExcelJS.Worksheet,
  range: string
): any[][] {
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

  for (
    let rowNum = startRow;
    rowNum <= Math.min(startRow + 10, endRow);
    rowNum++
  ) {
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
  for (
    let rowNum = Math.min(startRow + 11, endRow);
    rowNum <= endRow;
    rowNum++
  ) {
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
export function columnToIndex(column: string): number {
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 64);
  }
  return result - 1;
}

export function indexToColumn(index: number): string {
  let result = "";
  index++;
  while (index > 0) {
    index--;
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26);
  }
  return result;
}

// Excel 워크북 로드 및 시트 가져오기 헬퍼 함수
export async function getWorksheet(
  buffer: Buffer,
  sheetName?: string
): Promise<{ workbook: ExcelJS.Workbook; worksheet: ExcelJS.Worksheet }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const targetSheetName =
    sheetName ||
    workbook.worksheets.find((ws) => ws.name === "내역")?.name ||
    workbook.worksheets[0]?.name;

  if (!targetSheetName) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  const worksheet = workbook.getWorksheet(targetSheetName);

  if (!worksheet) {
    throw new Error(`시트 '${targetSheetName}'를 찾을 수 없습니다.`);
  }

  return { workbook, worksheet };
}
