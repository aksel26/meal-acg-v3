import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  ExpenseProcessingWorkbookError,
  exportExpenseProcessingWorkbook,
  parseExpenseProcessingWorkbook,
} from "./expense-processing-workbook.js";

const workbook = XLSX.utils.book_new();
const source = XLSX.utils.aoa_to_sheet([
  ["안내"],
  [
    "승인일",
    "이용자명",
    "구분",
    "상세내역1",
    "상세내역2(식당이름)",
    "수정 금지",
  ],
  ["2026-07-01", "김관리", "", "점심", "", "그대로"],
  ["2026-07-02", "이운영", "식대", "", "식당", "유지"],
]);
const unrelated = XLSX.utils.aoa_to_sheet([["다른 시트"], ["보존값"]]);
source.C3!.l = { Target: "https://example.com/receipt" };
source.C3!.z = "@";
XLSX.utils.book_append_sheet(workbook, source, "비용");
XLSX.utils.book_append_sheet(workbook, unrelated, "기타");
const original = XLSX.write(workbook, {
  type: "buffer",
  bookType: "xlsx",
  cellStyles: true,
});

const parsed = parseExpenseProcessingWorkbook(original);
assert.equal(parsed.sheetName, "비용");
assert.equal(parsed.headerRow, 2);
assert.equal(parsed.rows.length, 2);
assert.deepEqual(
  {
    rowNumber: parsed.rows[0]?.rowNumber,
    categoryCell: parsed.rows[0]?.categoryCell,
    detail1Cell: parsed.rows[0]?.detail1Cell,
    detail2Cell: parsed.rows[0]?.detail2Cell,
  },
  { rowNumber: 3, categoryCell: "C3", detail1Cell: "D3", detail2Cell: "E3" },
);

const exported = exportExpenseProcessingWorkbook(original, parsed.sheetName, [
  {
    ...parsed.rows[0]!,
    category: "복리후생",
    detail1: "팀 점심",
    detail2: "새 식당",
  },
]);
const reopened = XLSX.read(exported, { type: "buffer", cellStyles: true });
assert.equal(reopened.Sheets["비용"]?.C3?.v, "복리후생");
assert.equal(
  reopened.Sheets["비용"]?.C3?.l?.Target,
  "https://example.com/receipt",
);
assert.equal(reopened.Sheets["비용"]?.C3?.z, "@");
assert.equal(reopened.Sheets["비용"]?.D3?.v, "팀 점심");
assert.equal(reopened.Sheets["비용"]?.E3?.v, "새 식당");
assert.equal(reopened.Sheets["비용"]?.A3?.v, "2026-07-01");
assert.equal(reopened.Sheets["비용"]?.F3?.v, "그대로");
assert.equal(reopened.Sheets["기타"]?.A2?.v, "보존값");

const missingHeader = XLSX.write(
  {
    SheetNames: ["비용"],
    Sheets: {
      비용: XLSX.utils.aoa_to_sheet([
        ["승인일", "이용자명", "구분", "상세내역1"],
      ]),
    },
  },
  { type: "buffer", bookType: "xlsx" },
);
assert.throws(
  () => parseExpenseProcessingWorkbook(missingHeader),
  ExpenseProcessingWorkbookError,
);
assert.throws(
  () => parseExpenseProcessingWorkbook(Buffer.from("승인일,이용자명")),
  ExpenseProcessingWorkbookError,
);

console.log("expense-processing-workbook regression: ok");
