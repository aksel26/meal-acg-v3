/** 특이사항 상태별 배지 색상 */
export const STATUS_COLORS: Record<string, string> = {
  정상: "bg-emerald-50 text-emerald-700 border-emerald-200",
  육아휴직: "bg-pink-50 text-pink-700 border-pink-200",
  병가: "bg-red-50 text-red-700 border-red-200",
  재택근무: "bg-cyan-50 text-cyan-700 border-cyan-200",
  파견: "bg-indigo-50 text-indigo-700 border-indigo-200",
  휴직: "bg-amber-50 text-amber-700 border-amber-200",
  퇴사: "bg-slate-100 text-slate-500 border-slate-300",
};

/** 정산 제외 대상 상태 */
export const SETTLEMENT_EXCLUDED_STATUSES = new Set([
  "육아휴직",
  "병가",
  "파견",
  "휴직",
  "퇴사",
]);

/** 직책별 배지 색상 */
export function roleBadgeStyle(role: string) {
  switch (role) {
    case "본부장":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "팀장":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "인턴":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}
