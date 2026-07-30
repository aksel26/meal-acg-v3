// 휴가 잔액 집계 단일 공식 — /api/leave-balances 소비 화면들과 /api/chat이 공유
// 대상: annual + monthly (summer 등 제외). total = granted + adjusted, remaining = total - used

export interface LeaveBalanceRow {
  type: string;
  granted: number;
  used: number;
  adjusted: number;
}

export interface LeaveSummary {
  total: number;
  used: number;
  remaining: number;
}

export function summarizeLeaveBalances(rows: LeaveBalanceRow[]): LeaveSummary {
  const target = rows.filter(
    (row) => row.type === "annual" || row.type === "monthly",
  );
  const total = target.reduce((sum, row) => sum + row.granted + row.adjusted, 0);
  const used = target.reduce((sum, row) => sum + row.used, 0);
  return { total, used, remaining: total - used };
}
