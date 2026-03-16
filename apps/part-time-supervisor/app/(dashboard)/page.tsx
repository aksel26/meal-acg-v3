"use client";

import { useState, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { useDashboard } from "@/hooks/use-dashboard";
import { useDashboardCalendar } from "@/hooks/use-dashboard-calendar";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { JobPostingGrid } from "@/components/dashboard/JobPostingGrid";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-6 w-12 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-1.5">
                    <div className="h-5 w-40 rounded bg-muted" />
                    <div className="h-3 w-56 rounded bg-muted" />
                  </div>
                  <div className="h-5 w-14 rounded-full bg-muted" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="rounded-lg bg-muted/50 p-2 h-12" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const today = dayjs();
  const [dateRange, setDateRange] = useState({
    startDate: today.format("YYYY-MM-DD"),
    endDate: today.format("YYYY-MM-DD"),
  });
  const [selectedDate, setSelectedDate] = useState(today.toDate());
  const [displayMonth, setDisplayMonth] = useState(today.toDate());

  const calendarYear = displayMonth.getFullYear();
  const calendarMonth = displayMonth.getMonth() + 1;
  const { dayMap } = useDashboardCalendar(calendarYear, calendarMonth);

  const { data, isLoading } = useDashboard(dateRange.startDate, dateRange.endDate);

  const activePreset = useMemo(() => {
    const d = dayjs();
    const day = d.day();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = d.add(diffToMonday, "day").format("YYYY-MM-DD");
    const sunday = d.add(diffToMonday + 6, "day").format("YYYY-MM-DD");
    const monthFirst = d.startOf("month").format("YYYY-MM-DD");
    const monthLast = d.endOf("month").format("YYYY-MM-DD");
    const todayStr = d.format("YYYY-MM-DD");

    if (dateRange.startDate === todayStr && dateRange.endDate === todayStr) return "오늘";
    if (dateRange.startDate === monday && dateRange.endDate === sunday) return "이번 주";
    if (dateRange.startDate === monthFirst && dateRange.endDate === monthLast) return "이번 달";
    return null;
  }, [dateRange]);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    const formatted = dayjs(date).format("YYYY-MM-DD");
    setDateRange({ startDate: formatted, endDate: formatted });
  }, []);

  const handlePreset = useCallback(
    (range: { startDate: string; endDate: string }) => {
      setDateRange(range);
      setSelectedDate(dayjs(range.startDate).toDate());
    },
    []
  );

  const dateLabel =
    dateRange.startDate === dateRange.endDate
      ? dayjs(dateRange.startDate).format("M월 D일 (ddd)")
      : `${dayjs(dateRange.startDate).format("M/D")} ~ ${dayjs(dateRange.endDate).format("M/D")}`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
      {/* 좌측: 캘린더 */}
      <div className="rounded-xl border bg-card">
        <DashboardCalendar
          dayMap={dayMap}
          selectedDate={selectedDate}
          displayMonth={displayMonth}
          onDisplayMonthChange={setDisplayMonth}
          onDateSelect={handleDateSelect}
          onPreset={handlePreset}
          activePreset={activePreset}
        />
      </div>

      {/* 우측: 요약 + 공고 현황 */}
      <div className="space-y-6 min-w-0">
        <p className="text-sm text-muted-foreground">{dateLabel} 기준 현황</p>

        {isLoading ? (
          <DashboardSkeleton />
        ) : data ? (
          <>
            <DashboardSummary summary={data.summary} />
            <JobPostingGrid jobPostings={data.jobPostings} />
          </>
        ) : null}
      </div>
    </div>
  );
}
