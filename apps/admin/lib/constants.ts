/** 특이사항 상태별 배지 색상 */
export const STATUS_COLORS: Record<string, string> = {
  정상: "bg-emerald-50 text-emerald-600",
  육아휴직: "bg-violet-100 text-violet-700",
  병가: "bg-rose-100 text-rose-700",
  재택근무: "bg-sky-100 text-sky-700",
  파견: "bg-amber-100 text-amber-700",
  휴직: "bg-orange-100 text-orange-700",
  퇴사: "bg-slate-100 text-slate-400",
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
    case "대표":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "본부장":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "팀장":
      return "bg-slate-100 text-slate-800 border-slate-300";
    case "인턴":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

/** 특정 멤버 직급 하드코딩 오버라이드 */
const ROLE_OVERRIDES: Record<string, string> = {
  "정진우": "대표",
};

/** 포인트/식대 관리 페이지에서 숨길 멤버 */
export const HIDDEN_MEMBER_NAMES = new Set(["정진우"]);

export function applyRoleOverride<T extends { full_name?: string; member_role?: string | null }>(
  member: T
): T {
  const override = member.full_name ? ROLE_OVERRIDES[member.full_name] : undefined;
  if (override && member.member_role !== undefined) {
    return { ...member, member_role: override };
  }
  return member;
}
