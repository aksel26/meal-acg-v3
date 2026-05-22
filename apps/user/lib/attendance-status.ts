export const FLEX_CHECK_IN_START_HOUR = 8;
export const FLEX_CHECK_IN_END_HOUR = 10;

export type CheckInStatus = "early_check_in" | "normal" | "late";

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
