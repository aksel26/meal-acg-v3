import dayjs from "dayjs";

export const INDIVIDUAL_MEAL_ATTENDANCE = "근무(개별식사 / 식사안함)";

export type MealAttendanceSource = "meal" | "dayoff" | "attendance";

export interface ExternalAttendanceRecord {
  date: string;
  attendance: string;
  source: Exclude<MealAttendanceSource, "meal">;
}

export function isWeekday(date: string): boolean {
  const day = dayjs(date).day();
  return day !== 0 && day !== 6;
}

export function isNoMealAttendance(attendance: string | null): boolean {
  if (!attendance) return false;
  return (
    attendance.includes("연차") ||
    attendance.includes("휴가") ||
    attendance.includes("휴무") ||
    attendance.includes("반차") ||
    attendance.includes("재택")
  );
}

export function isHalfDayOff(attendance: string | null): boolean {
  if (!attendance) return false;
  return attendance.includes("반차");
}

export function normalizeDayoffAttendance(
  leaveType?: {
    name?: string | null;
    category?: string | null;
    duration_type?: string | null;
  } | null,
): string | null {
  const category = leaveType?.category || "";
  const durationType = leaveType?.duration_type || "";

  if (category === "지각/조퇴") return null;
  if (durationType === "morning") {
    return "오전 반차/휴무";
  }
  if (durationType === "afternoon") {
    return "오후 반차/휴무";
  }
  return durationType === "full" ? "연차/휴무" : null;
}

export function normalizeAttendanceRecordType(
  attendanceType: string | null,
): string | null {
  if (!attendanceType) return null;
  if (attendanceType.includes("재택")) return "재택근무";
  if (attendanceType.includes("오전") && attendanceType.includes("반차")) {
    return "오전 반차/휴무";
  }
  if (attendanceType.includes("오후") && attendanceType.includes("반차")) {
    return "오후 반차/휴무";
  }
  if (attendanceType.includes("반차")) return "오전 반차/휴무";
  if (
    attendanceType.includes("연차") ||
    attendanceType.includes("휴가") ||
    attendanceType.includes("휴무")
  ) {
    return "연차/휴무";
  }
  return null;
}

export function mergeExternalAttendance<
  T extends { date: string; attendance: string | null },
>(
  mealRows: T[],
  externalRecords: ExternalAttendanceRecord[],
): Array<T & { attendance_source?: MealAttendanceSource }> {
  const externalByDate = new Map<string, ExternalAttendanceRecord>();
  for (const record of externalRecords) {
    if (!externalByDate.has(record.date)) {
      externalByDate.set(record.date, record);
    }
  }

  const merged: Array<T & { attendance_source?: MealAttendanceSource }> =
    mealRows.map((meal) => {
      const external = externalByDate.get(meal.date);
      if (!external) {
        return { ...meal, attendance_source: "meal" as const };
      }
      return {
        ...meal,
        attendance: external.attendance,
        attendance_source: external.source,
      };
    });

  const mealDates = new Set(mealRows.map((meal) => meal.date));
  for (const external of externalRecords) {
    if (mealDates.has(external.date)) continue;
    merged.push({
      date: external.date,
      attendance: external.attendance,
      attendance_source: external.source,
    } as T & { attendance_source?: MealAttendanceSource });
  }

  return merged.sort((a, b) => a.date.localeCompare(b.date));
}
