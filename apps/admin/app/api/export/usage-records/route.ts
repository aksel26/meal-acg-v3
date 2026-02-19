import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import ExcelJS from "exceljs";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function halfYearToDateRange(
  period: string
): { start: string; end: string } | null {
  const match = period.match(/^(\d{4})-H([12])$/);
  if (!match) return null;
  const year = match[1];
  if (match[2] === "1") {
    return { start: `${year}-01-01`, end: `${year}-06-30` };
  }
  return { start: `${year}-07-01`, end: `${year}-12-31` };
}

/** 반기 period에서 해당하는 6개 월 번호 배열 반환 */
function getHalfYearMonths(period: string): number[] {
  const match = period.match(/^(\d{4})-H([12])$/);
  if (!match) return [];
  return match[2] === "1" ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
}

const ROLE_ORDER: Record<string, number> = {
  본부장: 0,
  팀장: 1,
  팀원: 2,
  인턴: 3,
};

// ── 공통 스타일 상수 ──
const FONT_NAME = "나눔바른고딕";
const BORDER_COLOR = "FF808080";
const HEADER_FILL = "FFDBDBDB";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

const headerFill: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: HEADER_FILL },
};


/** 셀에 공통 헤더 스타일 적용 */
function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = { name: FONT_NAME, size: 10, bold: true };
  cell.fill = headerFill;
  cell.border = thinBorder;
  cell.alignment = { vertical: "middle", horizontal: "center" };
}

/** 셀에 공통 데이터 스타일 적용 */
function applyDataStyle(
  cell: ExcelJS.Cell,
  opts?: { numFmt?: string; align?: "left" | "center" | "right"; indent?: number; redFont?: boolean }
) {
  cell.font = {
    name: FONT_NAME,
    size: 10,
    ...(opts?.redFont ? { color: { argb: "FFFF0000" } } : {}),
  };
  cell.border = thinBorder;
  cell.alignment = {
    vertical: "middle",
    horizontal: opts?.align ?? "center",
    ...(opts?.indent ? { indent: opts.indent } : {}),
  };
  if (opts?.numFmt) cell.numFmt = opts.numFmt;
}

// GET /api/export/usage-records - 사용내역 Excel 내보내기
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period");
    const type = searchParams.get("type");
    const memberId = searchParams.get("member_id");
    const reviewStatus = searchParams.get("review_status");

    // 반기 period인 경우 추가 시트용 데이터도 조회
    const range = period ? halfYearToDateRange(period) : null;
    const isHalfYear = !!range;

    // ── 기존 Raw data 쿼리 ──
    let rawQuery = supabase
      .from("usage_records")
      .select("*, members!usage_records_member_id_fkey(full_name)");

    if (period) {
      if (range) {
        rawQuery = rawQuery.gte("used_at", range.start).lte("used_at", range.end);
      } else {
        rawQuery = rawQuery.like("used_at", `${period}%`);
      }
    }
    if (type) {
      rawQuery = rawQuery.eq("type", type);
    }
    if (memberId) {
      rawQuery = rawQuery.eq("member_id", memberId);
    }
    if (reviewStatus !== null && reviewStatus !== undefined) {
      if (reviewStatus === "in_progress") {
        rawQuery = rawQuery.in("review_status", [1, 2]);
      } else {
        rawQuery = rawQuery.eq("review_status", parseInt(reviewStatus, 10));
      }
    }

    // ── 병렬 데이터 조회 ──
    const [rawResult, budgetResult, membersResult, statusResult] =
      await Promise.all([
        rawQuery.order("used_at", { ascending: false }),
        // 사용 가이드 + 통계용
        isHalfYear
          ? supabase.from("budget_summary").select("*").eq("period", period!)
          : Promise.resolve({ data: null, error: null }),
        // 멤버 (팀 정보 포함)
        isHalfYear
          ? supabase
              .from("members")
              .select("*, teams(name)")
          : Promise.resolve({ data: null, error: null }),
        // 특이사항 인원
        isHalfYear
          ? supabase
              .from("member_current_status")
              .select("member_id, current_status")
              .not("current_status", "is", null)
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (rawResult.error) {
      console.error("Error fetching usage records:", rawResult.error);
      return NextResponse.json(
        { error: "Failed to fetch usage records" },
        { status: 500 }
      );
    }

    const records = rawResult.data || [];

    // ── ExcelJS workbook ──
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ACG Admin";
    workbook.created = new Date();

    // ── 추가 시트 (반기 period일 때만) ──
    if (isHalfYear && budgetResult.data && membersResult.data) {
      const budgetData = budgetResult.data;
      // members 쿼리에서 teams join을 flatten
      const membersData = (membersResult.data as any[]).map(
        ({ teams, ...rest }: any) => ({
          ...rest,
          team_name: (teams as { name: string } | null)?.name ?? null,
        })
      );
      const statusMemberIds = new Set(
        (statusResult.data || []).map((m: any) => m.member_id).filter(Boolean)
      );
      const months = getHalfYearMonths(period!);

      buildGuideSheet(workbook, budgetData, membersData, statusMemberIds);
      buildStatsSheet(workbook, budgetData, months);
    }

    // ── Raw data 시트 (항상 마지막) ──
    buildRawDataSheet(workbook, records);

    // ── Generate buffer ──
    const buffer = await workbook.xlsx.writeBuffer();

    const fileName = encodeURIComponent("복포활동비_사용내역.xlsx");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (error) {
    console.error("Usage records export API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════
// 시트 1: 사용 가이드
// ═══════════════════════════════════════════════════════

/** 금액을 "150,000" 형식으로 포맷 */
function fmtCurrency(amount: number): string {
  return amount.toLocaleString();
}

function buildGuideSheet(
  workbook: ExcelJS.Workbook,
  budgetData: any[],
  membersData: any[],
  statusMemberIds: Set<string>
) {
  const ws = workbook.addWorksheet("사용 가이드");

  ws.columns = [
    { width: 6 },  // A: No
    { width: 8 },  // B: 직급
    { width: 10 }, // C: 이름
    { width: 8 },  // D: 인원
    { width: 50 }, // E: 활동비 기준
    { width: 14 }, // F: 활동비
    { width: 14 }, // G: 복지포인트
  ];

  // member_id별 budget 그룹화
  const budgetMap = new Map<string, { activity: number; welfare: number }>();
  for (const row of budgetData) {
    if (!row.member_id) continue;
    if (!budgetMap.has(row.member_id)) {
      budgetMap.set(row.member_id, { activity: 0, welfare: 0 });
    }
    const entry = budgetMap.get(row.member_id)!;
    if (row.type === "활동비") entry.activity = row.total_amount || 0;
    else entry.welfare = row.total_amount || 0;
  }

  // budget_summary의 고유 멤버 정보 수집
  const memberInfoMap = new Map<
    string,
    { member_name: string; member_role: string; team_name: string }
  >();
  for (const row of budgetData) {
    if (!row.member_id || memberInfoMap.has(row.member_id)) continue;
    memberInfoMap.set(row.member_id, {
      member_name: row.member_name || "",
      member_role: row.member_role || "",
      team_name: row.team_name || "",
    });
  }

  // 정렬: 역할순 → 이름순
  const sortedMembers = Array.from(memberInfoMap.entries()).sort(
    ([, a], [, b]) => {
      const ra = ROLE_ORDER[a.member_role] ?? 99;
      const rb = ROLE_ORDER[b.member_role] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.member_name.localeCompare(b.member_name, "ko");
    }
  );

  // ── 활동비 기준 계산 (budget page 로직 복제) ──
  const LEADER_RATE = 200000;
  const MANAGER_RATE = 150000;
  const PNC_EXTRA_RATE = 50000;

  // team_id별 멤버 수 (인턴 제외, 특이사항 제외 안 함 — budget page와 동일)
  const teamCounts = new Map<string, number>();
  for (const m of membersData) {
    if (m.team_id && m.member_role !== "인턴") {
      teamCounts.set(m.team_id, (teamCounts.get(m.team_id) || 0) + 1);
    }
  }

  // team_id별 인턴 목록 (특이사항 제외)
  const teamInterns = new Map<string, any[]>();
  for (const m of membersData) {
    if (m.team_id && m.member_role === "인턴" && !statusMemberIds.has(m.id)) {
      const list = teamInterns.get(m.team_id) || [];
      list.push(m);
      teamInterns.set(m.team_id, list);
    }
  }

  // P&C팀 식별
  const pncMember = membersData.find(
    (m: any) =>
      (m.member_role === "팀장" || m.member_role === "본부장") &&
      (m.team_name?.includes("People & Culture") || m.team_name?.includes("P&C"))
  );
  const pncTeamId = pncMember?.team_id;

  // P&C 추가 인원 수 (전체 팀원+인턴, 특이사항 제외, 팀 배정된 멤버만)
  const pncExtraCount = pncTeamId
    ? membersData.filter(
        (m: any) =>
          (m.member_role === "팀원" || m.member_role === "인턴") &&
          m.team_id &&
          !statusMemberIds.has(m.id)
      ).length
    : 0;

  // membersData → id 기반 lookup
  const memberById = new Map<string, any>();
  for (const m of membersData) {
    memberById.set(m.id, m);
  }

  // team_name 기준 멤버 수 (budget_summary에서 고유 member_id 카운트)
  const teamMemberCount = new Map<string, number>();
  const seenForCount = new Set<string>();
  for (const row of budgetData) {
    if (!row.member_id || seenForCount.has(row.member_id)) continue;
    seenForCount.add(row.member_id);
    const teamName = row.team_name || "";
    teamMemberCount.set(teamName, (teamMemberCount.get(teamName) || 0) + 1);
  }

  /** 활동비 기준 텍스트 생성 */
  function getActivityBasis(memberId: string, info: { member_role: string; team_name: string }): string {
    const member = memberById.get(memberId);
    if (!member) return "-";

    if (info.member_role !== "본부장" && info.member_role !== "팀장") return "-";

    const memberCount = member.team_id ? (teamCounts.get(member.team_id) || 1) : 1;
    const isPnC = !!(pncTeamId && member.team_id === pncTeamId);
    const interns = member.team_id ? (teamInterns.get(member.team_id) || []) : [];

    let basis: string;
    if (info.member_role === "본부장") {
      basis = `${fmtCurrency(LEADER_RATE)}원 × ${memberCount}명`;
    } else if (isPnC) {
      const parts: string[] = [];
      parts.push(`본인 ${fmtCurrency(MANAGER_RATE)}원`);
      if (memberCount > 1) {
        parts.push(`${fmtCurrency(MANAGER_RATE)}원 × ${memberCount - 1}명`);
      }
      if (pncExtraCount > 0) {
        parts.push(`${fmtCurrency(PNC_EXTRA_RATE)}원 × ${pncExtraCount}명 (팀원+인턴)`);
      }
      basis = parts.join(" + ");
    } else {
      const parts: string[] = [];
      parts.push(`본인 ${fmtCurrency(MANAGER_RATE)}원`);
      if (memberCount > 1) {
        parts.push(`${fmtCurrency(MANAGER_RATE)}원 × ${memberCount - 1}명`);
      }
      basis = parts.join(" + ");
    }

    // 인턴 내역
    if (interns.length > 0) {
      const internAmount = interns.reduce((sum: number, intern: any) => {
        const months = intern.intern_months || 1;
        return sum + Math.round(MANAGER_RATE / 6 * months);
      }, 0);
      if (internAmount > 0) {
        const internParts = interns.map((intern: any) => {
          const months = intern.intern_months || 1;
          return `인턴 ${intern.full_name} ${fmtCurrency(MANAGER_RATE)}원/6×${months}개월`;
        });
        basis += " + " + internParts.join(" + ");
      }
    }

    return basis;
  }

  // ── Row 1: Title ──
  ws.mergeCells("A1:G1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "ACG 활동비 및 복지포인트 사용 가이드";
  titleCell.font = {
    name: FONT_NAME,
    size: 16,
    bold: true,
    italic: true,
    underline: true,
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  // ── Row 2: Headers ──
  const headers = ["No", "직급", "이름", "인원", "활동비 기준", "활동비", "복지포인트"];
  const headerRow = ws.getRow(2);
  headerRow.values = headers;
  headerRow.height = 20;
  for (let col = 1; col <= 7; col++) {
    applyHeaderStyle(headerRow.getCell(col));
  }

  // ── Row 3+: Data ──
  sortedMembers.forEach(([memberId, info], index) => {
    const row = ws.getRow(index + 3);
    const budget = budgetMap.get(memberId) || { activity: 0, welfare: 0 };

    // D열: 인원 — 본부장/팀장만 해당 팀 인원수, 팀원/인턴은 "-"
    const isLeader = info.member_role === "본부장" || info.member_role === "팀장";
    const teamCount = isLeader ? (teamMemberCount.get(info.team_name || "") || "-") : "-";

    row.values = [
      index + 1,
      info.member_role,
      info.member_name,
      teamCount,
      getActivityBasis(memberId, info),
      budget.activity,
      budget.welfare,
    ];

    for (let col = 1; col <= 7; col++) {
      const cell = row.getCell(col);
      if (col === 5) {
        applyDataStyle(cell, { align: "left", indent: 1 });
      } else if (col === 6 || col === 7) {
        applyDataStyle(cell, { numFmt: "#,##0", align: "right" });
      } else {
        applyDataStyle(cell);
      }
    }
  });
}

// ═══════════════════════════════════════════════════════
// 시트 2: 통계
// ═══════════════════════════════════════════════════════
function buildStatsSheet(
  workbook: ExcelJS.Workbook,
  budgetData: any[],
  months: number[]
) {
  const ws = workbook.addWorksheet("통계");

  // 컬럼: A(No), B(구분), C(이름), D~E(사용가능액), F~G(잔여액), H~I(사용금액), J~O(활동비 월별), P~U(복지 월별)
  const colWidths = [
    6,  // A: No
    8,  // B: 구분
    10, // C: 이름
    14, // D: 사용가능액-활동비
    14, // E: 사용가능액-복지
    14, // F: 잔여액-활동비
    14, // G: 잔여액-복지
    14, // H: 사용금액-활동비
    14, // I: 사용금액-복지
    ...Array(6).fill(12), // J~O: 활동비 월별
    ...Array(6).fill(12), // P~U: 복지포인트 월별
  ];
  ws.columns = colWidths.map((w) => ({ width: w }));

  // budget_summary에서 멤버 목록 추출 (No, 구분, 이름 열용)
  const memberMap = new Map<
    string,
    { member_name: string; member_role: string }
  >();
  for (const row of budgetData) {
    if (!row.member_id || memberMap.has(row.member_id)) continue;
    memberMap.set(row.member_id, {
      member_name: row.member_name || "",
      member_role: row.member_role || "",
    });
  }

  const sortedMembers = Array.from(memberMap.values()).sort((a, b) => {
    const ra = ROLE_ORDER[a.member_role] ?? 99;
    const rb = ROLE_ORDER[b.member_role] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.member_name.localeCompare(b.member_name, "ko");
  });

  // ── Row 1: 그룹 헤더 ──
  const row1 = ws.getRow(1);
  row1.height = 20;

  ws.mergeCells("A1:A2");
  ws.getCell("A1").value = "No";
  ws.mergeCells("B1:B2");
  ws.getCell("B1").value = "구분";
  ws.mergeCells("C1:C2");
  ws.getCell("C1").value = "이름";

  ws.mergeCells("D1:E1");
  ws.getCell("D1").value = "사용 가능액";
  ws.mergeCells("F1:G1");
  ws.getCell("F1").value = "잔여액";
  ws.mergeCells("H1:I1");
  ws.getCell("H1").value = "사용 금액";
  ws.mergeCells("J1:O1");
  ws.getCell("J1").value = "활동비 월별";
  ws.mergeCells("P1:U1");
  ws.getCell("P1").value = "복지포인트 월별";

  for (let col = 1; col <= 21; col++) {
    applyHeaderStyle(row1.getCell(col));
  }

  // ── Row 2: 서브 헤더 ──
  const row2 = ws.getRow(2);
  row2.height = 20;

  // D~E, F~G, H~I 서브 헤더
  row2.getCell(4).value = "활동비";  // D2
  row2.getCell(5).value = "복지포인트";     // E2
  row2.getCell(6).value = "활동비";  // F2
  row2.getCell(7).value = "복지포인트";     // G2
  row2.getCell(8).value = "활동비";  // H2
  row2.getCell(9).value = "복지포인트";  // I2: SUMIFS 타입 매칭용

  // J~O: 활동비 월별 (숫자 + numFmt)
  months.forEach((m, i) => {
    const cell = row2.getCell(10 + i); // J=10, K=11, ...O=15
    cell.value = m;
    cell.numFmt = '0"월"';
  });
  // P~U: 복지포인트 월별 (숫자 + numFmt)
  months.forEach((m, i) => {
    const cell = row2.getCell(16 + i); // P=16, Q=17, ...U=21
    cell.value = m;
    cell.numFmt = '0"월"';
  });

  for (let col = 1; col <= 21; col++) {
    applyHeaderStyle(row2.getCell(col));
  }

  // ── Row 3+: 데이터 (수식 기반) ──
  // ExcelJS column letters
  const colLetter = (c: number) => String.fromCharCode(64 + c); // 1→A, 2→B, ...

  sortedMembers.forEach((member, index) => {
    const r = index + 3; // row number
    const row = ws.getRow(r);

    // A~C: 정적 값
    row.getCell(1).value = index + 1;
    row.getCell(2).value = member.member_role;
    row.getCell(3).value = member.member_name;

    // D: =VLOOKUP($C{r},'사용 가이드'!$C$3:$G$200,4,0)
    row.getCell(4).value = {
      formula: `VLOOKUP($C${r},'사용 가이드'!$C$3:$G$200,4,0)`,
    } as any;
    // E: =VLOOKUP($C{r},'사용 가이드'!$C$3:$G$200,5,0)
    row.getCell(5).value = {
      formula: `VLOOKUP($C${r},'사용 가이드'!$C$3:$G$200,5,0)`,
    } as any;
    // F: =D{r}-H{r}
    row.getCell(6).value = { formula: `D${r}-H${r}` } as any;
    // G: =E{r}-I{r}
    row.getCell(7).value = { formula: `E${r}-I${r}` } as any;
    // H: =SUM(J{r}:O{r})
    row.getCell(8).value = { formula: `SUM(J${r}:O${r})` } as any;
    // I: =SUM(P{r}:U{r})
    row.getCell(9).value = { formula: `SUM(P${r}:U${r})` } as any;

    // J~O: 활동비 SUMIFS
    for (let i = 0; i < 6; i++) {
      const col = 10 + i; // J=10 ... O=15
      const cl = colLetter(col);
      row.getCell(col).value = {
        formula: `SUMIFS('Raw data'!$I:$I,'Raw data'!$B:$B,$C${r},'Raw data'!$D:$D,${cl}$2,'Raw data'!$G:$G,$H$2)`,
      } as any;
    }

    // P~U: 복지포인트 SUMIFS
    for (let i = 0; i < 6; i++) {
      const col = 16 + i; // P=16 ... U=21
      const cl = colLetter(col);
      row.getCell(col).value = {
        formula: `SUMIFS('Raw data'!$I:$I,'Raw data'!$B:$B,$C${r},'Raw data'!$D:$D,${cl}$2,'Raw data'!$G:$G,$I$2)`,
      } as any;
    }

    // 스타일
    for (let col = 1; col <= 21; col++) {
      const cell = row.getCell(col);
      if (col >= 4) {
        applyDataStyle(cell, { numFmt: "#,##0", align: "right" });
      } else {
        applyDataStyle(cell);
      }
    }
  });

  // ── 합계 행 ──
  const lastDataRow = sortedMembers.length + 2; // last data row number
  const totalRowNum = lastDataRow + 1;
  const totalRow = ws.getRow(totalRowNum);

  ws.mergeCells(`A${totalRowNum}:C${totalRowNum}`);
  ws.getCell(`A${totalRowNum}`).value = "합계";

  // D~U: =SUM({col}3:{col}{lastDataRow})
  for (let col = 4; col <= 21; col++) {
    const cl = colLetter(col);
    totalRow.getCell(col).value = {
      formula: `SUM(${cl}3:${cl}${lastDataRow})`,
    } as any;
  }

  // 합계 행 스타일
  for (let col = 1; col <= 21; col++) {
    const cell = totalRow.getCell(col);
    if (col <= 3) {
      cell.font = { name: FONT_NAME, size: 10, bold: true };
      cell.fill = headerFill;
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    } else {
      cell.font = { name: FONT_NAME, size: 10, bold: true };
      cell.fill = headerFill;
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.numFmt = "#,##0";
    }
  }
}

// ═══════════════════════════════════════════════════════
// 시트 3: Raw data (기존 로직)
// ═══════════════════════════════════════════════════════
function buildRawDataSheet(workbook: ExcelJS.Workbook, records: any[]) {
  const ws = workbook.addWorksheet("Raw data");

  ws.columns = [
    { width: 6 },  // A: No
    { width: 9 },  // B: 이름
    { width: 6 },  // C: 연도
    { width: 4 },  // D: 월
    { width: 4 },  // E: 일
    { width: 4 },  // F: 요일
    { width: 9 },  // G: 활동비
    { width: 44 }, // H: 사유
    { width: 14 }, // I: 금액
    { width: 13 }, // J: P&C팀 확인
    { width: 20 }, // K: 비고
  ];

  // ── Row 1: Title ──
  const titleRow = ws.getRow(1);
  ws.mergeCells("A1:K1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "ACG 활동비 및 복지포인트 사용 내역";
  titleCell.font = {
    name: FONT_NAME,
    size: 16,
    bold: true,
    italic: true,
    underline: true,
  };

  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  titleRow.height = 28;

  // ── Row 2: Subtitle ──
  const subtitleRow = ws.getRow(2);
  ws.mergeCells("A2:B2");
  const subtitleCell = ws.getCell("A2");
  subtitleCell.value = "본인 직접 입력란";
  subtitleCell.font = { name: FONT_NAME, size: 10, bold: true };
  subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
  subtitleRow.height = 16;

  // ── Row 3: Headers ──
  const headers = [
    "No",
    "이름",
    "연도",
    "월",
    "일",
    "요일",
    "활동비",
    "사유",
    "금액",
    "P&C팀 확인",
    "비고",
  ];
  const headerRow = ws.getRow(3);
  headerRow.values = headers;
  headerRow.height = 20;

  for (let col = 1; col <= 11; col++) {
    applyHeaderStyle(headerRow.getCell(col));
  }

  // ── Row 4+: Data ──
  records.forEach((record: any, index: number) => {
    const rowNum = index + 4;
    const row = ws.getRow(rowNum);

    const usedAt = new Date(record.used_at);
    const year = usedAt.getFullYear();
    const month = usedAt.getMonth() + 1;
    const day = usedAt.getDate();
    const dayOfWeek = DAY_NAMES[usedAt.getDay()];

    const reviewStatusVal = record.review_status ?? 0;
    let reviewDisplay = "-";
    if (reviewStatusVal === 1 && record.first_reviewed_at) {
      const d = new Date(record.first_reviewed_at);
      reviewDisplay = `1차 (${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")})`;
    } else if (reviewStatusVal === 2 && record.reviewed_at) {
      const d = new Date(record.reviewed_at);
      reviewDisplay = `최종완료 (${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")})`;
    }

    row.values = [
      index + 1,
      record.members?.full_name || "",
      year,
      month,
      day,
      dayOfWeek,
      record.type,
      record.description || "",
      record.amount || 0,
      reviewDisplay,
      "", // K: 비고
    ];

    for (let col = 1; col <= 11; col++) {
      const cell = row.getCell(col);
      cell.font = { name: FONT_NAME, size: 10 };
      cell.border = thinBorder;

      if (col === 8) {
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
          indent: 1,
        };
      } else if (col === 9) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = "#,##0";
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    }
  });
}
