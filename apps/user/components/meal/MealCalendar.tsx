"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MealData } from "@/components/dashboard/types";
import { SectionLabel } from "./SectionLabel";

dayjs.locale("ko");

type CalendarDay = {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
};

type MarkerType = "meal" | "individual" | "off" | "half";

interface MealCalendarProps {
  year: number;
  month: number;
  selectedDate?: Date;
  mealData: MealData[];
  onDateSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

/** 근태/식사 기록으로 날짜 마커 유형 결정 */
function resolveMarker(meal: MealData | undefined): MarkerType | null {
  if (!meal) return null;
  const attendance = meal.attendance || "";

  if (attendance.includes("개별식사")) return "individual";
  if (attendance.includes("반차")) return "half";
  if (
    attendance.includes("연차") ||
    attendance.includes("재택") ||
    attendance.includes("휴무")
  ) {
    return "off";
  }

  const hasMeal =
    !!(meal.breakfast?.amount || meal.breakfast?.store) ||
    !!(meal.lunch?.amount || meal.lunch?.store) ||
    !!(meal.dinner?.amount || meal.dinner?.store);

  if (hasMeal || attendance.includes("근무") || attendance.includes("출근")) {
    return "meal";
  }
  return null;
}

function DayMarker({ type }: { type: MarkerType }) {
  if (type === "off") {
    return <span className="text-[11px] leading-none">🌴</span>;
  }
  if (type === "individual") {
    return (
      <span className="h-[7px] w-[7px] rounded-full border-[1.5px] border-blue-500" />
    );
  }
  if (type === "half") {
    return <span className="h-[7px] w-[7px] rounded-full bg-amber-400" />;
  }
  return <span className="h-[7px] w-[7px] rounded-full bg-blue-500" />;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function MealCalendar({
  year,
  month,
  selectedDate,
  mealData,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
}: MealCalendarProps) {
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const start = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
    const daysInMonth = start.daysInMonth();
    const startDay = start.day();
    const days: CalendarDay[] = [];

    for (let i = 0; i < startDay; i++) {
      const d = start.subtract(startDay - i, "day");
      days.push({
        date: d.format("YYYY-MM-DD"),
        dayOfMonth: d.date(),
        isCurrentMonth: false,
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = start.date(i);
      days.push({
        date: d.format("YYYY-MM-DD"),
        dayOfMonth: i,
        isCurrentMonth: true,
      });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    if (remaining > 0) {
      const lastDay = dayjs(days[days.length - 1]!.date);
      for (let i = 1; i <= remaining; i++) {
        const d = lastDay.add(i, "day");
        days.push({
          date: d.format("YYYY-MM-DD"),
          dayOfMonth: d.date(),
          isCurrentMonth: false,
        });
      }
    }
    return days;
  }, [year, month]);

  const mealByDate = useMemo(() => {
    const map = new Map<string, MealData>();
    for (const meal of mealData) map.set(meal.date, meal);
    return map;
  }, [mealData]);

  const selectedStr = selectedDate
    ? dayjs(selectedDate).format("YYYY-MM-DD")
    : "";
  const todayStr = dayjs().format("YYYY-MM-DD");

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      {/* 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <SectionLabel>Calendar</SectionLabel>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            {month}월
          </span>
          <span className="text-sm text-slate-400">{year}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="이전 달"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-50 text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="다음 달"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-50 text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`pb-1 text-center text-[11px] font-medium ${
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

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dow = dayjs(day.date).day();
          const isSelected = day.date === selectedStr;
          const isToday = day.date === todayStr;
          const marker = resolveMarker(mealByDate.get(day.date));

          return (
            <button
              key={day.date}
              type="button"
              onClick={() =>
                day.isCurrentMonth && onDateSelect(dayjs(day.date).toDate())
              }
              disabled={!day.isCurrentMonth}
              className={`group flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-lg py-1.5 transition-colors ${
                !day.isCurrentMonth
                  ? "cursor-default opacity-0"
                  : "cursor-pointer hover:bg-gray-50"
              } ${isSelected ? "bg-[#f5f3ef]" : ""}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center text-[15px] ${
                  isToday
                    ? "rounded-full bg-slate-900 font-semibold text-white"
                    : dow === 0
                      ? "text-red-400"
                      : dow === 6
                        ? "text-blue-400"
                        : "font-medium text-slate-700"
                }`}
              >
                {day.dayOfMonth}
              </span>
              <span className="flex h-[9px] items-center justify-center">
                {marker && <DayMarker type={marker} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
