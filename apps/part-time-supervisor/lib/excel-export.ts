import ExcelJS from "exceljs";
import type { JobPosting, AssignmentWithDetails } from "@/lib/supabase/types";

// 헤더 배경색 (연한 파란색 - 원본 템플릿 theme 4, 80% tint)
const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFBDD7EE" },
};

const FONT_BASE = { name: "나눔고딕" };

const BORDER_THIN: ExcelJS.Border = { style: "thin", color: { argb: "FF000000" } };
const BORDER_MEDIUM: ExcelJS.Border = { style: "medium", color: { argb: "FF000000" } };

function formatDateKR(dateStr: string): string {
  // "2026-03-15" -> "2026년 03월 15일"
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${m}월 ${d}일`;
}

export async function generateContractListExcel(
  job: JobPosting,
  assignments: AssignmentWithDetails[]
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("계약서", {
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  // === Column widths ===
  ws.columns = [
    { width: 2.33 },  // A
    { width: 5.83 },  // B
    { width: 13.16 }, // C
    { width: 22.16 }, // D
    { width: 14.16 }, // E (연락처 넓게)
    { width: 14.16 }, // F
    { width: 13.16 }, // G
    { width: 13.16 }, // H
    { width: 1.5 },   // I
    { width: 8.83 },  // J
    { width: 8.83 },  // K
    { width: 8.83 },  // L
  ];

  // === Rows 1-3: spacer ===
  for (let r = 1; r <= 3; r++) {
    ws.getRow(r).height = 3;
  }

  // === Row 4: Title ===
  ws.getRow(4).height = 30;
  ws.mergeCells("B4:H4");
  const titleCell = ws.getCell("B4");
  titleCell.value = "현금지급확인 및 정보 보안계약서 (표준근로계약서 대체용)";
  titleCell.font = { ...FONT_BASE, size: 20, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  // === Row 5: Contract intro ===
  ws.getRow(5).height = 65.25;
  ws.mergeCells("B5:H5");
  const introCell = ws.getCell("B5");
  introCell.value =
    " '㈜에이시지알'과 '계약자'는 인적성검사의 용역을 위하여 상호 선의에 입각하여 본 계약서의 각 조항을 성실히 이행할 것을 확약하고 다음과 같이 계약을 체결하며, 아르바이트 비용을 현금으로 지급받았음을 확인합니다.";
  introCell.font = { ...FONT_BASE, size: 11, bold: true };
  introCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

  // === Row 6: Purpose ===
  ws.getRow(6).height = 69.75;
  ws.mergeCells("B6:H6");
  const purposeCell = ws.getCell("B6");
  purposeCell.value =
    "목적\n 본 『계약서』는 ㈜에이시지알이 주관하는 그룹의 인·적성검사 실시와 관련하여 발생되는 모든 자료와 정보에 관련된 보안을 위한 계약내용을 담고 있으며, 이와 관련된 정보 등이 허가 없이 외부에 유출, 공개되는 것을 막고 자료보안의 범위및 대상, 자료보안의 방법 등을 규정함으로써 검사시행과 관련된 회사의 지적자산을 보호하고자 하는 데에 목적이 있다. 또한 본 계약서는 단시간 근로자 표준근로계약서와 대체 됨을 명시한다.";
  purposeCell.font = { ...FONT_BASE, size: 10 };
  purposeCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

  // === Row 7: spacer ===
  ws.getRow(7).height = 5;

  // === Row 8: Damage compensation ===
  ws.getRow(8).height = 68.25;
  ws.mergeCells("B8:H8");
  const damageCell = ws.getCell("B8");
  damageCell.value =
    "손해배상\n 본 계약사항을 위반한 경우에 \u2018계약자\u2019는 \u2018㈜에이시지알\u2019에게 손해배상책임을 진다. 손해배상의 범위 및 액수는 직접적인 손해뿐만 아니라 피해회복에 필요한 일체의 비용을 포함하되, 금삼천만원으로한다. 다만 \u2018㈜에이시지알\u2019이 삼천만원이 넘는 추가 손해를 증명하는 경우에는 추가부분도 배상하여야 한다. 또한 \u2018㈜에이시지알\u2019이 법적조치에 들어갈 경우 \u2018계약자\u2019는 변호사에게 지불하는 비용 등 일체의 법적비용에 대해서도 책임을 져야 한다. ";
  damageCell.font = { ...FONT_BASE, size: 10 };
  damageCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

  // === Row 9: Location & Date ===
  ws.getRow(9).height = 24.75;
  ws.mergeCells("B9:D9");
  const locationCell = ws.getCell("B9");
  locationCell.value = `근로장소: ${job.location || ""}`;
  locationCell.font = { ...FONT_BASE, size: 10, bold: true };
  locationCell.alignment = { horizontal: "left", vertical: "middle" };

  ws.mergeCells("E9:F9");
  const dateCell = ws.getCell("E9");
  const startDateKR = formatDateKR(job.start_date);
  dateCell.value = `근무일: ${startDateKR} ~ ${startDateKR}`;
  dateCell.font = { ...FONT_BASE, size: 10, bold: true };
  dateCell.alignment = { horizontal: "left", vertical: "middle" };

  // === Row 10: Job title & Work hours ===
  ws.getRow(10).height = 24.75;
  ws.mergeCells("B10:D10");
  const jobNameCell = ws.getCell("B10");
  jobNameCell.value = `근무명: ${job.title}`;
  jobNameCell.font = { ...FONT_BASE, size: 10, bold: true };
  jobNameCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

  ws.mergeCells("E10:F10");
  const hoursCell = ws.getCell("E10");
  const workHours =
    job.work_start && job.work_end
      ? `${job.work_start.slice(0, 5)}~${job.work_end.slice(0, 5)}`
      : "";
  hoursCell.value = `근무시간 : ${workHours}`;
  hoursCell.font = { ...FONT_BASE, size: 10, bold: true };
  hoursCell.alignment = { horizontal: "left", vertical: "middle" };

  // === Row 11: Supervisor ===
  ws.getRow(11).height = 24.75;
  const supervisorCell = ws.getCell("B11");
  supervisorCell.value = `에이시지알 담당자: ${job.supervisor_name || ""}`;
  supervisorCell.font = { ...FONT_BASE, size: 10, bold: true };
  supervisorCell.alignment = { vertical: "middle" };

  // === Row 12: spacer ===
  ws.getRow(12).height = 12.75;

  // === Row 13-14: Headers ===
  ws.getRow(13).height = 13;
  ws.getRow(14).height = 28;

  // Header cells - Row 13 (merged with row 14 for B-F)
  const headerDefs: { col: string; label: string; mergeDown: boolean }[] = [
    { col: "B", label: "NO", mergeDown: true },
    { col: "C", label: "성명", mergeDown: true },
    { col: "D", label: "주민번호\n(뒷자리까지 , 신고용)", mergeDown: true },
    { col: "E", label: "연락처", mergeDown: true },
    { col: "F", label: "금액", mergeDown: true },
  ];

  for (const h of headerDefs) {
    ws.mergeCells(`${h.col}13:${h.col}14`);
    const cell = ws.getCell(`${h.col}13`);
    cell.value = h.label;
    cell.font = { ...FONT_BASE, size: 10, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = HEADER_FILL;
  }

  // "서명 및 날인" spans G13:H13
  ws.mergeCells("G13:H13");
  const signHeaderCell = ws.getCell("G13");
  signHeaderCell.value = "(서명 및 날인)";
  signHeaderCell.font = { ...FONT_BASE, size: 9, bold: true };
  signHeaderCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  signHeaderCell.fill = HEADER_FILL;

  // Sub-headers in row 14
  const subG = ws.getCell("G14");
  subG.value = "보안계약";
  subG.font = { ...FONT_BASE, size: 10, bold: true };
  subG.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  subG.fill = HEADER_FILL;

  const subH = ws.getCell("H14");
  subH.value = "현금지급\n확인";
  subH.font = { ...FONT_BASE, size: 10, bold: true };
  subH.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  subH.fill = HEADER_FILL;

  // Header borders
  applyHeaderBorders(ws, 13, 14);

  // === Data rows (Row 15+) ===
  const minRows = 12;
  const dataRowCount = Math.max(assignments.length, minRows);
  const DATA_START = 15;

  for (let i = 0; i < dataRowCount; i++) {
    const rowNum = DATA_START + i;
    const row = ws.getRow(rowNum);
    row.height = 35;

    const a = assignments[i];
    const worker = a?.worker;

    // B: NO
    const bCell = ws.getCell(`B${rowNum}`);
    bCell.value = i + 1;
    bCell.font = { ...FONT_BASE, size: 10 };
    bCell.alignment = { horizontal: "center", vertical: "middle" };

    // C: 성명
    const cCell = ws.getCell(`C${rowNum}`);
    cCell.value = worker?.name || "";
    cCell.font = { ...FONT_BASE, size: 10 };
    cCell.alignment = { horizontal: "center", vertical: "middle" };

    // D: 주민번호 (빈칸)
    const dCell = ws.getCell(`D${rowNum}`);
    dCell.value = "";
    dCell.font = { ...FONT_BASE, size: 10 };
    dCell.alignment = { horizontal: "left", vertical: "middle" };

    // E: 연락처
    const eCell = ws.getCell(`E${rowNum}`);
    eCell.value = worker?.phone || "";
    eCell.font = { ...FONT_BASE, size: 10 };
    eCell.alignment = { horizontal: "center", vertical: "middle" };

    // F: 금액 (빈칸)
    const fCell = ws.getCell(`F${rowNum}`);
    fCell.value = "";
    fCell.font = { ...FONT_BASE, size: 10 };
    fCell.alignment = { horizontal: "center", vertical: "middle" };

    // G: 보안계약 (확인)
    const gCell = ws.getCell(`G${rowNum}`);
    gCell.value = "(확인)";
    gCell.font = { ...FONT_BASE, size: 10, bold: true };
    gCell.alignment = { horizontal: "center", vertical: "middle" };

    // H: 현금지급확인 (확인)
    const hCell = ws.getCell(`H${rowNum}`);
    hCell.value = "(확인)";
    hCell.font = { ...FONT_BASE, size: 10, bold: true };
    hCell.alignment = { horizontal: "center", vertical: "middle" };

    // Borders (not last — 지출비용 row follows)
    applyDataRowBorders(ws, rowNum, false);
  }

  // === 지출비용 row (테이블 마지막 행, 테두리 내부) ===
  const costRow = DATA_START + dataRowCount;
  ws.getRow(costRow).height = 31.5;
  ws.mergeCells(`B${costRow}:E${costRow}`);
  const costCell = ws.getCell(`B${costRow}`);
  costCell.value = "지출비용 ";
  costCell.font = { ...FONT_BASE, size: 10, bold: true };
  costCell.fill = HEADER_FILL;
  costCell.alignment = { vertical: "middle" };
  costCell.border = { left: BORDER_MEDIUM, top: BORDER_THIN, bottom: BORDER_MEDIUM };
  ws.getCell(`E${costRow}`).border = { right: BORDER_THIN, top: BORDER_THIN, bottom: BORDER_MEDIUM };

  ws.mergeCells(`F${costRow}:H${costRow}`);
  const costRightCell = ws.getCell(`F${costRow}`);
  costRightCell.fill = HEADER_FILL;
  costRightCell.border = { left: BORDER_THIN, top: BORDER_THIN, bottom: BORDER_MEDIUM };
  ws.getCell(`H${costRow}`).border = { right: BORDER_MEDIUM, top: BORDER_THIN, bottom: BORDER_MEDIUM };

  // === Footer section ===
  const footerStart = costRow + 1;

  // Spacer
  ws.getRow(footerStart).height = 9.75;

  // 참고사항
  const noteStart = footerStart + 1;
  const notes = [
    { text: "* 담당자 참고사항", height: 13 },
    {
      text: "  1. 담당자는 반드시 아르바이트생의 신분증과 현금지급 확인서에 기입한 내용이 맞는지 확인 하신후 비용을 지급하시기 바랍니다. ",
      height: 22.5,
    },
    { text: "     대조가 어려울 경우 신분증 사본을 받으시기 바랍니다.", height: 22.5 },
    {
      text: "  2. 각 개인에게 현급 지급과 동시에 서명란에 친필 서명을 반드시 받으시기 바랍니다.",
      height: 22.5,
    },
    { text: "  3. 각 개인별 연락처도 꼭 기재바랍니다.", height: 30 },
  ];

  notes.forEach((n, i) => {
    const r = noteStart + i;
    ws.getRow(r).height = n.height;
    const cell = ws.getCell(`B${r}`);
    cell.value = n.text;
    cell.font = { name: "맑은 고딕", size: 10, bold: true };
    cell.alignment = { vertical: "middle" };
  });

  // Generate buffer
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function applyHeaderBorders(ws: ExcelJS.Worksheet, row13: number, row14: number) {
  // Row 13 borders
  ws.getCell(`B${row13}`).border = { left: BORDER_MEDIUM, right: BORDER_THIN, top: BORDER_MEDIUM, bottom: BORDER_THIN };
  ws.getCell(`C${row13}`).border = { left: BORDER_THIN, right: BORDER_THIN, top: BORDER_MEDIUM, bottom: BORDER_THIN };
  ws.getCell(`D${row13}`).border = { left: BORDER_THIN, right: BORDER_THIN, top: BORDER_MEDIUM, bottom: BORDER_THIN };
  ws.getCell(`E${row13}`).border = { left: BORDER_THIN, right: BORDER_THIN, top: BORDER_MEDIUM, bottom: BORDER_THIN };
  ws.getCell(`F${row13}`).border = { left: BORDER_THIN, right: BORDER_THIN, top: BORDER_MEDIUM, bottom: BORDER_THIN };
  ws.getCell(`G${row13}`).border = { left: BORDER_THIN, right: BORDER_MEDIUM, top: BORDER_MEDIUM, bottom: BORDER_THIN };

  // Row 14 borders
  ws.getCell(`B${row14}`).border = { left: BORDER_MEDIUM, right: BORDER_THIN, bottom: BORDER_THIN };
  ws.getCell(`C${row14}`).border = { left: BORDER_THIN, right: BORDER_THIN, bottom: BORDER_THIN };
  ws.getCell(`D${row14}`).border = { left: BORDER_THIN, right: BORDER_THIN, bottom: BORDER_THIN };
  ws.getCell(`E${row14}`).border = { left: BORDER_THIN, right: BORDER_THIN, bottom: BORDER_THIN };
  ws.getCell(`F${row14}`).border = { left: BORDER_THIN, right: BORDER_THIN, bottom: BORDER_THIN };
  ws.getCell(`G${row14}`).border = { left: BORDER_THIN, bottom: BORDER_THIN };
  ws.getCell(`H${row14}`).border = { left: BORDER_THIN, right: BORDER_MEDIUM, bottom: BORDER_THIN };
}

function applyDataRowBorders(ws: ExcelJS.Worksheet, rowNum: number, isLast: boolean) {
  const bottom = isLast ? BORDER_MEDIUM : BORDER_THIN;
  ws.getCell(`B${rowNum}`).border = { left: BORDER_MEDIUM, right: BORDER_THIN, top: BORDER_THIN, bottom };
  ws.getCell(`C${rowNum}`).border = { left: BORDER_THIN, right: BORDER_THIN, top: BORDER_THIN, bottom };
  ws.getCell(`D${rowNum}`).border = { left: BORDER_THIN, right: BORDER_THIN, top: BORDER_THIN, bottom };
  ws.getCell(`E${rowNum}`).border = { left: BORDER_THIN, right: BORDER_THIN, top: BORDER_THIN, bottom };
  ws.getCell(`F${rowNum}`).border = { left: BORDER_THIN, right: BORDER_THIN, top: BORDER_THIN, bottom };
  ws.getCell(`G${rowNum}`).border = { left: BORDER_THIN, top: BORDER_THIN, bottom };
  ws.getCell(`H${rowNum}`).border = { left: BORDER_THIN, right: BORDER_MEDIUM, top: BORDER_THIN, bottom };
}

export function getContractFileName(job: JobPosting): string {
  const location = job.location || "미정";
  const title = job.title;
  const date = job.start_date.replace(/-/g, "");
  return `${location}_${title}_리스트_${date}.xlsx`;
}
