"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import type { DayoffRecord } from "@/hooks/use-dayoffs";

dayjs.locale("ko");

interface AttendanceRecord {
  id: string;
  date: string;
  attendance_type: string;
  status: string;
  check_in_status: string | null;
  check_out_status: string | null;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const TYPE_COLORS: Record<string, string> = {
  근무: "bg-slate-500",
  휴가: "bg-emerald-500",
  재택: "bg-amber-500",
  외근: "bg-blue-500",
};
const DEFAULT_TYPE_COLOR = "bg-slate-500";

interface AttendanceCalendarProps {
  year: number;
  month: number;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  records: AttendanceRecord[];
  dayoffs?: DayoffRecord[];
}

export default function AttendanceCalendar({
  year,
  month,
  selectedDate,
  onDateSelect,
  records,
  dayoffs = [],
}: AttendanceCalendarProps) {
  const recordMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    records.forEach((r) => {
      map[r.date] = r;
    });
    return map;
  }, [records]);
  const dayoffsMap = useMemo(() => {
    const map: Record<string, DayoffRecord[]> = {};
    dayoffs.forEach((r) => {
      map[r.leave_date] = [...(map[r.leave_date] || []), r];
    });
    return map;
  }, [dayoffs]);

  const today = dayjs().format("YYYY-MM-DD");

  const monthStart = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
  const daysInMonth = monthStart.daysInMonth();
  const startDayOfWeek = monthStart.day();

  const allDays = useMemo(() => {
    const days: (string | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(
        dayjs(
          `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        ).format("YYYY-MM-DD"),
      );
    }
    return days;
  }, [year, month, daysInMonth, startDayOfWeek]);

  const weeks = useMemo(() => {
    const result: (string | null)[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }
    const lastWeek = result[result.length - 1];
    if (lastWeek && lastWeek.length < 7) {
      while (lastWeek.length < 7) {
        lastWeek.push(null);
      }
    }
    return result;
  }, [allDays]);

  return (
    <div className="overflow-hidden rounded-xl bg-white p-4">
      <div className="mb-2 grid grid-cols-7">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium ${
              i === 0
                ? "text-red-400"
                : i === 6
                  ? "text-blue-400"
                  : "text-slate-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-y-1.5">
            {week.map((dateStr, di) => {
              if (!dateStr) {
                return <div key={`empty-${wi}-${di}`} className="h-14" />;
              }

              const d = dayjs(dateStr);
              const dayNum = d.date();
              const dayOfWeek = d.day();
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const record = recordMap[dateStr];
              const dayoffCount = dayoffsMap[dateStr]?.length || 0;
              const dotColor = record
                ? TYPE_COLORS[record.attendance_type] || DEFAULT_TYPE_COLOR
                : null;
              const isSpecialStatus = Boolean(
                record &&
                  (["early_check_in", "late"].includes(
                    record.check_in_status ?? record.status,
                  ) ||
                    record.check_out_status === "early_leave"),
              );

              return (
                <button
                  key={dateStr}
                  onClick={() => onDateSelect(dateStr)}
                  className={`relative flex h-14 flex-col items-center justify-center rounded-lg transition-colors ${
                    isSelected
                      ? "bg-slate-100 text-slate-900"
                      : isToday
                        ? "bg-[#f9f9fa]"
                        : "hover:bg-[#f9f9fa]"
                  }`}
                >
                  <span
                    className={`text-sm ${
                      isSelected
                        ? "font-semibold text-slate-900"
                        : dayOfWeek === 0
                          ? "text-red-400"
                          : dayOfWeek === 6
                            ? "text-blue-400"
                            : "text-slate-700"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {(dotColor || dayoffCount > 0) && (
                    <span className="absolute bottom-2 flex items-center gap-0.5">
                      {dotColor && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${dotColor} ${
                            isSpecialStatus ? "ring-1 ring-red-400" : ""
                          }`}
                        />
                      )}
                      {dayoffCount > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 pt-3 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          휴가
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          출근
        </span>
      </div>
    </div>
  );
}
