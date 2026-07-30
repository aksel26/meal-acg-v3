import * as XLSX from "xlsx";

export const EXPENSE_PROCESSING_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const EXPENSE_PROCESSING_MAX_ROWS = 5000;

const REQUIRED_HEADERS = {
  approvalDate: ["승인일"],
  userName: ["이용자명"],
  category: ["구분"],
  detail1: ["상세내역1"],
  detail2: ["상세내역2", "상세내역2(식당이름)"],
} as const;

type HeaderKey = keyof typeof REQUIRED_HEADERS;

export type ExpenseProcessingWorkbookRow = {
  rowNumber: number;
  approvalDate: string;
  userName: string;
  category: string;
  detail1: string;
  detail2: string;
  categoryCell: string;
  detail1Cell: string;
  detail2Cell: string;
};

export type ParsedExpenseProcessingWorkbook = {
  sheetName: string;
  headerRow: number;
  rows: ExpenseProcessingWorkbookRow[];
};

export type ExpenseProcessingWorkbookEdit = Pick<
  ExpenseProcessingWorkbookRow,
  | "rowNumber"
  | "category"
  | "detail1"
  | "detail2"
  | "categoryCell"
  | "detail1Cell"
  | "detail2Cell"
>;

export class ExpenseProcessingWorkbookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpenseProcessingWorkbookError";
  }
}

function cellText(cell: XLSX.CellObject | undefined) {
  if (!cell) return "";
  return String(cell.w ?? XLSX.utils.format_cell(cell) ?? "");
}

function workbookFrom(buffer: Buffer | Uint8Array | ArrayBuffer) {
  const bytes =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (
    bytes.length < 4 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b ||
    bytes[2] !== 0x03 ||
    bytes[3] !== 0x04
  ) {
    throw new ExpenseProcessingWorkbookError(
      "읽을 수 있는 .xlsx 파일이 아닙니다.",
    );
  }
  try {
    return XLSX.read(buffer, {
      type: "array",
      cellFormula: true,
      cellNF: true,
      cellStyles: true,
      cellText: true,
    });
  } catch {
    throw new ExpenseProcessingWorkbookError(
      "읽을 수 있는 .xlsx 파일이 아닙니다.",
    );
  }
}

function findHeader(workbook: XLSX.WorkBook): {
  sheetName: string;
  row: number;
  columns: Record<HeaderKey, number>;
} | null {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = new Map<number, Map<string, number>>();
    for (const address of Object.keys(sheet)) {
      if (address.startsWith("!")) continue;
      const position = XLSX.utils.decode_cell(address);
      const text = cellText(sheet[address]).trim();
      if (!text) continue;
      const columns = rows.get(position.r) ?? new Map<string, number>();
      if (!columns.has(text)) columns.set(text, position.c);
      rows.set(position.r, columns);
    }

    for (const [row, values] of [...rows.entries()].sort(
      ([left], [right]) => left - right,
    )) {
      const columns = {} as Record<HeaderKey, number>;
      const complete = (
        Object.entries(REQUIRED_HEADERS) as [HeaderKey, readonly string[]][]
      ).every(([key, acceptedHeaders]) => {
        const header = acceptedHeaders.find((value) => values.has(value));
        if (!header) return false;
        columns[key] = values.get(header)!;
        return true;
      });
      if (complete) return { sheetName, row, columns };
    }
  }
  return null;
}

export function parseExpenseProcessingWorkbook(
  buffer: Buffer | Uint8Array | ArrayBuffer,
): ParsedExpenseProcessingWorkbook {
  const workbook = workbookFrom(buffer);
  const header = findHeader(workbook);
  if (!header) {
    throw new ExpenseProcessingWorkbookError(
      "필수 헤더(승인일, 이용자명, 구분, 상세내역1, 상세내역2)를 찾을 수 없습니다.",
    );
  }

  const sheet = workbook.Sheets[header.sheetName]!;
  const mappedColumns = new Set(Object.values(header.columns));
  const dataRowIndexes = new Set<number>();
  for (const address of Object.keys(sheet)) {
    if (address.startsWith("!")) continue;
    const position = XLSX.utils.decode_cell(address);
    if (
      position.r > header.row &&
      mappedColumns.has(position.c) &&
      cellText(sheet[address]) !== ""
    ) {
      dataRowIndexes.add(position.r);
    }
  }

  const orderedRows = [...dataRowIndexes].sort((left, right) => left - right);
  if (orderedRows.length === 0) {
    throw new ExpenseProcessingWorkbookError(
      "가져올 비용처리 데이터가 없습니다.",
    );
  }
  if (orderedRows.length > EXPENSE_PROCESSING_MAX_ROWS) {
    throw new ExpenseProcessingWorkbookError(
      `데이터 행은 최대 ${EXPENSE_PROCESSING_MAX_ROWS}개까지 지원합니다.`,
    );
  }

  const address = (column: HeaderKey, row: number) =>
    XLSX.utils.encode_cell({ c: header.columns[column], r: row });
  const value = (column: HeaderKey, row: number) =>
    cellText(sheet[address(column, row)]);

  return {
    sheetName: header.sheetName,
    headerRow: header.row + 1,
    rows: orderedRows.map((row) => ({
      rowNumber: row + 1,
      approvalDate: value("approvalDate", row),
      userName: value("userName", row),
      category: value("category", row),
      detail1: value("detail1", row),
      detail2: value("detail2", row),
      categoryCell: address("category", row),
      detail1Cell: address("detail1", row),
      detail2Cell: address("detail2", row),
    })),
  };
}

function assertMappedCell(address: string, rowNumber: number) {
  if (!/^[A-Z]{1,3}[1-9][0-9]*$/.test(address)) {
    throw new ExpenseProcessingWorkbookError(
      "저장된 원본 셀 정보가 올바르지 않습니다.",
    );
  }
  if (XLSX.utils.decode_cell(address).r + 1 !== rowNumber) {
    throw new ExpenseProcessingWorkbookError(
      "저장된 원본 행 정보가 올바르지 않습니다.",
    );
  }
}

export function exportExpenseProcessingWorkbook(
  original: Buffer | Uint8Array | ArrayBuffer,
  sheetName: string,
  rows: ExpenseProcessingWorkbookEdit[],
) {
  const workbook = workbookFrom(original);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new ExpenseProcessingWorkbookError(
      "원본 워크시트를 찾을 수 없습니다.",
    );
  }

  for (const row of rows) {
    const edits = [
      [row.categoryCell, row.category],
      [row.detail1Cell, row.detail1],
      [row.detail2Cell, row.detail2],
    ] as const;
    for (const [address, value] of edits) {
      assertMappedCell(address, row.rowNumber);
      const cell: XLSX.CellObject = {
        ...sheet[address],
        t: "s",
        v: value,
      };
      delete cell.f;
      delete cell.w;
      delete cell.h;
      delete cell.r;
      sheet[address] = cell;
    }
  }

  return Buffer.from(
    XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
      compression: true,
    }),
  );
}
