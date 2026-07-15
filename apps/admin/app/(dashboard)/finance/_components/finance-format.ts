export const formatCurrency = (amount: number | null | undefined) =>
  `${(amount || 0).toLocaleString()}원`;

export const STATUS_LABELS: Record<string, string> = {
  active: "활성",
  inactive: "비활성",
  draft: "작성",
  sent: "발송",
  approved: "승인",
  rejected: "반려",
  expired: "만료",
  completed: "완료",
  paused: "보류",
  canceled: "취소",
  expected: "예정",
  invoiced: "계산서 발행",
  paid: "입금/지급 완료",
  overdue: "미수",
  submitted: "제출",
  none: "없음",
  scheduled: "예정",
  issued: "발행",
};

export function statusLabel(value: string | null | undefined) {
  if (!value) return "-";
  return STATUS_LABELS[value] || value;
}

export function statusBadgeClass(value: string | null | undefined) {
  switch (value) {
    case "active":
    case "approved":
    case "paid":
    case "issued":
      return "rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700";
    case "sent":
    case "submitted":
    case "invoiced":
    case "scheduled":
      return "rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700";
    case "rejected":
    case "canceled":
    case "overdue":
      return "rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700";
    case "paused":
    case "expired":
    case "inactive":
      return "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500";
    default:
      return "rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700";
  }
}
