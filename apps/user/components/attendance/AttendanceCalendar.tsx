"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/ko";

dayjs.locale("ko");

interface AttendanceRecord {
  id: string;
  date: string;
  attendance_type: string;
  status: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const TYPE_COLORS: Record<string, string> = {
  근무: "bg-[oklch(0.55_0.18_250)]",
  휴가: "bg-[oklch(0.65_0.20_150)]",
  재택: "bg-[oklch(0.65_0.15_60)]",
  외근: "bg-[oklch(0.60_0.18_310)]",
};

interface AttendanceCalendarProps {
  year: number;
  month: number;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  records: AttendanceRecord[];
  defaultExpanded?: boolean;
}

export default function AttendanceCalendar({
  year,
  month,
  selectedDate,
  onDateSelect,
  records,
  defaultExpanded = false,
}: AttendanceCalendarProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const recordMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    records.forEach((r) => {
      map[r.date] = r;
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
        dayjs(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`).format("YYYY-MM-DD")
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
        week.some((d) => d === today)
      );
      return todayInMonth >= 0 ? todayInMonth : 0;
    }
    const idx = weeks.findIndex((week) =>
      week.some((d) => d === selectedDate)
    );
    return idx >= 0 ? idx : 0;
  }, [selectedDate, weeks, today]);

  const visibleWeeks = isExpanded ? weeks : [weeks[selectedWeekIndex]].filter(Boolean);

  return (
    <div className="card-premium rounded-2xl p-4 overflow-hidden">
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium ${
              i === 0
                ? "text-red-400"
                : i === 6
                  ? "text-blue-400"
                  : "text-[oklch(0.55_0.01_250)]"
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
                const record = recordMap[dateStr];
                const dotColor = record
                  ? TYPE_COLORS[record.attendance_type] || TYPE_COLORS["근무"]
                  : null;
                const isLateOrEarly =
                  record?.status === "late" || record?.status === "early_leave";

                return (
                  <button
                    key={dateStr}
                    onClick={() => onDateSelect(dateStr)}
                    className={`relative flex flex-col items-center justify-center h-10 rounded-xl transition-colors ${
                      isSelected
                        ? "bg-[oklch(0.55_0.18_250)] text-white"
                        : isToday
                          ? "bg-[oklch(0.95_0.03_250)]"
                          : "hover:bg-[oklch(0.97_0.01_250)]"
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
                              : "text-[oklch(0.30_0.02_250)]"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dotColor && (
                      <span
                        className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor} ${
                          isLateOrEarly ? "ring-1 ring-red-400" : ""
                        }`}
                      />
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
        className="flex items-center justify-center w-full mt-2 py-1 text-[oklch(0.55_0.02_250)]"
      >
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
