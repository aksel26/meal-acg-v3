/**
 * 시간 문자열("HH:MM")을 시간(number)으로 변환
 */
export function parseTime(time: string): number {
  const parts = time.split(":").map(Number);
  return (parts[0] ?? 0) + (parts[1] ?? 0) / 60;
}

/**
 * 공고의 시간 설정으로부터 기본 근무 시간 계산
 * null 대응: work_start/work_end null이면 8.0h, lunch null이면 공제 없음
 */
export function calculateDefaultWorkHours(
  workStart: string | null,
  workEnd: string | null,
  lunchStart: string | null,
  lunchEnd: string | null
): number {
  if (!workStart || !workEnd) return 8.0;

  let hours = parseTime(workEnd) - parseTime(workStart);
  if (lunchStart && lunchEnd) {
    hours -= parseTime(lunchEnd) - parseTime(lunchStart);
  }
  return Math.max(Math.round(hours * 10) / 10, 0);
}

/**
 * 금액 산정
 * 시급제: payRate × workHours
 * 일급제: payRate × 1 (일수 기준)
 */
export function calculateAmount(
  payType: "hourly" | "daily",
  payRate: number,
  workHours: number
): number {
  if (payType === "daily") return payRate;
  return payRate * workHours;
}

/**
 * 금액 포맷 (예: 1,500,000원)
 */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
