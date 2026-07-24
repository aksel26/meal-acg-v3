export const APPROVED_LEAVE_STATUSES = ["pre_approved", "approved"] as const;

export type ApprovedLeaveStatus = (typeof APPROVED_LEAVE_STATUSES)[number];

/** 파생값(연차·식대·근태) 관점에서 "확정 휴가"인지 (가승인·최종승인 모두 포함) */
export function isApprovedLeaveStatus(status: string | null | undefined): boolean {
  return status != null && (APPROVED_LEAVE_STATUSES as readonly string[]).includes(status);
}
