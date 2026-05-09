"use client";

import { useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RequestRecord } from "@/lib/requests";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function buildMonthGrid(month: Dayjs): Dayjs[] {
  const startOfMonth = month.startOf("month");
  const start = startOfMonth.subtract(startOfMonth.day(), "day");
  return Array.from({ length: 42 }, (_, i) => start.add(i, "day"));
}

interface CalendarPanelProps {
  requests: RequestRecord[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function CalendarPanel({
  requests,
  selectedDate,
  onSelectDate,
}: CalendarPanelProps) {
  const [month, setMonth] = useState<Dayjs>(() =>
    dayjs(selectedDate).startOf("month"),
  );

  const requestsByDate = useMemo(() => {
    const map = new Map<string, RequestRecord[]>();
    for (const request of requests) {
      if (!request.due_date) continue;
      const list = map.get(request.due_date) ?? [];
      list.push(request);
      map.set(request.due_date, list);
    }
    return map;
  }, [requests]);

  const days = useMemo(() => buildMonthGrid(month), [month]);
  const today = dayjs().format("YYYY-MM-DD");

  const goPrev = () => setMonth((m) => m.subtract(1, "month"));
  const goNext = () => setMonth((m) => m.add(1, "month"));
  const goToday = () => {
    const now = dayjs();
    setMonth(now.startOf("month"));
    onSelectDate(now.format("YYYY-MM-DD"));
  };

  return (
    <div className="rounded-xl border border-[#f3f3f3] bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#111111]">
          {month.format("YYYY년 M월")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            aria-label="이전 달"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-[#f9f9fa]"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-[#f9f9fa]"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="다음 달"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-[#f9f9fa]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 text-center text-[11px] font-medium text-slate-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-[#f3f3f3] bg-[#f3f3f3]">
        {days.map((day) => {
          const dateStr = day.format("YYYY-MM-DD");
          const isCurrentMonth = day.month() === month.month();
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const dayRequests = requestsByDate.get(dateStr) ?? [];

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex min-h-[92px] flex-col bg-white p-1.5 text-left transition-colors ${
                isSelected
                  ? "ring-2 ring-inset ring-[#111111]"
                  : "hover:bg-[#fafafa]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[11px] font-medium ${
                    isToday
                      ? "bg-[#111111] text-white"
                      : !isCurrentMonth
                        ? "text-slate-300"
                        : "text-slate-700"
                  }`}
                >
                  {day.date()}
                </span>
                {dayRequests.length > 0 && (
                  <span className="text-[10px] font-medium text-slate-400">
                    {dayRequests.length}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {dayRequests.slice(0, 2).map((request) => {
                  const muted =
                    request.status === "완료" || request.status === "거절";
                  return (
                    <div
                      key={request.id}
                      className={`truncate rounded-sm px-1.5 py-0.5 text-[10px] leading-tight ${
                        muted
                          ? "bg-[#f5f5f5] text-slate-400 line-through"
                          : "bg-[#f9f9fa] text-slate-700"
                      }`}
                    >
                      {request.title}
                    </div>
                  );
                })}
                {dayRequests.length > 2 && (
                  <div className="px-1.5 text-[10px] text-slate-400">
                    +{dayRequests.length - 2}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
