export const FLEX_CHECK_IN_START_HOUR = 8;
export const FLEX_CHECK_IN_END_HOUR = 10;

export type CheckInStatus = "early_check_in" | "normal" | "late";
export type CheckOutStatus = "normal" | "early_leave";

export const ATTENDANCE_STATUS_INFO: Record<
  CheckInStatus | "early_leave",
  { text: string; color: string }
> = {
  early_check_in: { text: "조기출근", color: "text-blue-600" },
  normal: { text: "정상", color: "text-emerald-600" },
  late: { text: "지각", color: "text-rose-600" },
  early_leave: { text: "조퇴", color: "text-amber-600" },
};

export function getCheckInStatus(
  hour: number,
  minute: number,
  second = 0,
): CheckInStatus {
  if (hour < FLEX_CHECK_IN_START_HOUR) {
    return "early_check_in";
  }

  if (
    hour > FLEX_CHECK_IN_END_HOUR ||
    (hour === FLEX_CHECK_IN_END_HOUR && (minute > 0 || second > 0))
  ) {
    return "late";
  }

  return "normal";
}

export function getAttendanceStatusInfos(record: {
  status?: string | null;
  check_in_status?: string | null;
  check_out_status?: string | null;
}) {
  const checkInStatus =
    record.check_in_status && record.check_in_status in ATTENDANCE_STATUS_INFO
      ? (record.check_in_status as CheckInStatus)
      : null;
  const fallbackStatus =
    record.status && record.status in ATTENDANCE_STATUS_INFO
      ? (record.status as keyof typeof ATTENDANCE_STATUS_INFO)
      : "normal";
  const statuses: (keyof typeof ATTENDANCE_STATUS_INFO)[] = [
    checkInStatus ?? fallbackStatus,
  ];

  if (
    record.check_out_status === "early_leave" &&
    !statuses.includes("early_leave")
  ) {
    statuses.push("early_leave");
  }

  return statuses.map((status) => ATTENDANCE_STATUS_INFO[status]);
}
