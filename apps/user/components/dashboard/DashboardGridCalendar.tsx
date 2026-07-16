"use client";

import { useMemo, type ReactNode } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarDay = {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
};

type DayData = {
  dayoffs: string[];
  tasks: string[];
  requests: string[];
  projects: string[];
};

interface Props {
  year: number;
  month: number;
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  dayDataMap?: Map<string, DayData>;
  headerAction?: ReactNode;
}

export default function DashboardGridCalendar({
  year,
  month,
  selectedDate,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
  dayDataMap,
  headerAction,
}: Props) {
  const calendarDays = useMemo(() => {
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
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
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

  const selectedStr = selectedDate
    ? dayjs(selectedDate).format("YYYY-MM-DD")
    : "";
  const todayStr = dayjs().format("YYYY-MM-DD");

  return (
    <div>
      {/* 헤더: 월 네비게이션 */}
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center">
        <div />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="이전 달"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-24 text-center text-base font-semibold text-slate-800">
            {year}년 {month}월
          </h2>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="다음 달"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="justify-self-end">{headerAction}</div>
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-px rounded-lg bg-slate-100 overflow-hidden">
        {/* 요일 헤더 */}
        {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
          <div
            key={day}
            className={`bg-slate-50 p-2 text-center text-xs font-semibold ${
              i === 0
                ? "text-red-400"
                : i === 6
                  ? "text-blue-400"
                  : "text-slate-500"
            }`}
          >
            {day}
          </div>
        ))}

        {/* 날짜 셀 */}
        {calendarDays.map((day) => {
          const dow = dayjs(day.date).day();
          const isSelected = day.date === selectedStr;
          const isToday = day.date === todayStr;
          const extra = dayDataMap?.get(day.date);

          return (
            <div
              key={day.date}
              onClick={() =>
                day.isCurrentMonth && onDateSelect(dayjs(day.date).toDate())
              }
              className={`min-h-[80px] bg-white p-1.5 transition-colors ${
                !day.isCurrentMonth
                  ? "opacity-30"
                  : "cursor-pointer hover:bg-slate-50"
              } ${isSelected ? "ring-1 ring-inset ring-slate-800" : ""}`}
            >
              {/* 날짜 숫자 */}
              <div className="flex items-center gap-1 mb-0.5">
                <span
                  className={`text-xs font-medium ${
                    isToday
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white text-[10px]"
                      : dow === 0
                        ? "text-red-400"
                        : dow === 6
                          ? "text-blue-400"
                          : "text-slate-700"
                  }`}
                >
                  {day.dayOfMonth}
                </span>
              </div>

              {/* 인디케이터 */}
              {day.isCurrentMonth && (
                <div className="space-y-0.5">
                  {extra && extra.dayoffs.length > 0 && (
                    <div className="truncate rounded px-1 py-0.5 text-[10px] bg-rose-50 text-slate-600">
                      {extra.dayoffs.length === 1
                        ? extra.dayoffs[0]!
                        : `내근태 +${extra.dayoffs.length}`}
                    </div>
                  )}
                  {extra && extra.tasks.length > 0 && (
                    <div className="truncate rounded px-1 py-0.5 text-[10px] bg-blue-50 text-slate-600">
                      {extra.tasks.length === 1
                        ? "검사/면접"
                        : `검사/면접 +${extra.tasks.length}`}
                    </div>
                  )}
                  {extra && extra.projects.length > 0 && (
                    <div className="truncate rounded px-1 py-0.5 text-[10px] bg-emerald-50 text-slate-600">
                      {extra.projects.length === 1
                        ? "프로젝트"
                        : `프로젝트 +${extra.projects.length}`}
                    </div>
                  )}
                  {extra && extra.requests.length > 0 && (
                    <div className="truncate rounded px-1 py-0.5 text-[10px] bg-amber-50 text-slate-600">
                      {extra.requests.length === 1
                        ? "요청"
                        : `요청 +${extra.requests.length}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
