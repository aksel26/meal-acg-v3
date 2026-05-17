"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import type { DayoffRecord } from "./types";
import { getLeaveTypeColor } from "./types";

dayjs.locale("ko");

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface DayoffsCalendarProps {
  year: number;
  month: number;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  records: DayoffRecord[];
  defaultExpanded?: boolean;
}

export default function DayoffsCalendar({
  year,
  month,
  selectedDate,
  onDateSelect,
  records,
  defaultExpanded = false,
}: DayoffsCalendarProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const recordsByDate = useMemo(() => {
    const map: Record<string, DayoffRecord[]> = {};
    records.forEach((r) => {
      const list = map[r.leave_date] || [];
      list.push(r);
      map[r.leave_date] = list;
    });
    return map;
  }, [records]);

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

  const selectedWeekIndex = useMemo(() => {
    if (!selectedDate) {
      const todayInMonth = weeks.findIndex((week) =>
        week.some((d) => d === today),
      );
      return todayInMonth >= 0 ? todayInMonth : 0;
    }
    const idx = weeks.findIndex((week) => week.some((d) => d === selectedDate));
    return idx >= 0 ? idx : 0;
  }, [selectedDate, weeks, today]);

  const visibleWeeks = isExpanded
    ? weeks
    : weeks[selectedWeekIndex]
      ? [weeks[selectedWeekIndex]]
      : [weeks[0]!];

  return (
    <div className="overflow-hidden rounded-xl border border-[#f3f3f3] bg-white p-4">
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

      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? "expanded" : `week-${selectedWeekIndex}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {visibleWeeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-y-1">
              {week.map((dateStr, di) => {
                if (!dateStr) {
                  return <div key={`empty-${wi}-${di}`} className="h-10" />;
                }

                const d = dayjs(dateStr);
                const dayNum = d.date();
                const dayOfWeek = d.day();
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const dateRecords = recordsByDate[dateStr] || [];
                const dots = dateRecords.slice(0, 3);

                return (
                  <button
                    key={dateStr}
                    onClick={() => onDateSelect(dateStr)}
                    className={`relative flex h-10 flex-col items-center justify-center rounded-lg transition-colors ${
                      isSelected
                        ? "bg-[#111111] text-white"
                        : isToday
                          ? "bg-[#f9f9fa]"
                          : "hover:bg-[#f9f9fa]"
                    }`}
                  >
                    <span
                      className={`text-sm ${
                        isSelected
                          ? "font-semibold text-white"
                          : dayOfWeek === 0
                            ? "text-red-400"
                            : dayOfWeek === 6
                              ? "text-blue-400"
                              : "text-slate-700"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dots.length > 0 && (
                      <span className="absolute bottom-1 flex gap-0.5">
                        {dots.map((r) => {
                          const color = getLeaveTypeColor(
                            r.leave_type?.category,
                          );
                          return (
                            <span
                              key={r.id}
                              className={`h-1.5 w-1.5 rounded-full ${!r.approver_id ? "ring-1 ring-white/50" : ""}`}
                              style={{ backgroundColor: color.dot }}
                            />
                          );
                        })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 flex w-full items-center justify-center rounded-lg py-1 text-slate-500 transition-colors hover:bg-[#f9f9fa]"
        aria-label={isExpanded ? "달력 접기" : "달력 펼치기"}
      >
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
