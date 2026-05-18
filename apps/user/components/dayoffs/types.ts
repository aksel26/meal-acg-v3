export type { DayoffRecord, LeaveType } from "@/hooks/use-dayoffs";

export interface MemberOption {
  id: string;
  full_name: string;
}

export interface DayoffFormData {
  targetId: string;
  approverIds: string[];
  ccMemberIds: string[];
  startDate: string;
  endDate: string;
  leaveTypeId: number;
  lateHour: string;
  lateMinute: string;
  reason: string;
  editReason: string;
}

export const defaultFormData: DayoffFormData = {
  targetId: "",
  approverIds: [],
  ccMemberIds: [],
  startDate: "",
  endDate: "",
  leaveTypeId: 0,
  lateHour: "09",
  lateMinute: "00",
  reason: "",
  editReason: "",
};

interface LeaveTypeColor {
  dot: string;
  badge: string;
  text: string;
}

export const LEAVE_TYPE_COLORS: Record<string, LeaveTypeColor> = {
  "지각/조퇴": {
    dot: "oklch(0.60 0.22 25)",
    badge: "oklch(0.93 0.04 25)",
    text: "oklch(0.45 0.15 25)",
  },
  반차: {
    dot: "oklch(0.60 0.18 310)",
    badge: "oklch(0.93 0.04 310)",
    text: "oklch(0.45 0.12 310)",
  },
  연차: {
    dot: "oklch(0.65 0.18 60)",
    badge: "oklch(0.93 0.04 60)",
    text: "oklch(0.45 0.12 60)",
  },
  대체휴무: {
    dot: "oklch(0.55 0.18 250)",
    badge: "oklch(0.93 0.04 250)",
    text: "oklch(0.45 0.12 250)",
  },
  경조휴무: {
    dot: "oklch(0.60 0.18 340)",
    badge: "oklch(0.93 0.04 340)",
    text: "oklch(0.45 0.12 340)",
  },
  특별휴무: {
    dot: "oklch(0.55 0.15 180)",
    badge: "oklch(0.93 0.04 180)",
    text: "oklch(0.40 0.12 180)",
  },
  훈련: {
    dot: "oklch(0.55 0.05 250)",
    badge: "oklch(0.93 0.01 250)",
    text: "oklch(0.45 0.02 250)",
  },
  휴무: {
    dot: "oklch(0.55 0.15 150)",
    badge: "oklch(0.93 0.04 150)",
    text: "oklch(0.40 0.12 150)",
  },
};

const FALLBACK_COLOR: LeaveTypeColor = {
  dot: "oklch(0.55 0.05 250)",
  badge: "oklch(0.93 0.01 250)",
  text: "oklch(0.45 0.02 250)",
};

export function getLeaveTypeColor(category: string | undefined): LeaveTypeColor {
  if (!category) return FALLBACK_COLOR;
  return LEAVE_TYPE_COLORS[category] ?? FALLBACK_COLOR;
}

export function formatLeaveTypeName(
  record: { leave_type_id: number; late_hour: string | null; late_minute: string | null; leave_type: { name: string } | null }
): string {
  let name = record.leave_type?.name || "";
  if (record.leave_type_id === 1 && record.late_hour) {
    name = `지각-${record.late_hour}시${record.late_minute || "00"}분`;
  }
  return name;
}
