"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@repo/ui/src/button";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { ChevronRight, ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

dayjs.locale("ko");
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
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

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

  const presets = useMemo(() => {
    const d = dayjs();
    const day = d.day();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = d.add(diffToMonday, "day").format("YYYY-MM-DD");
    const sunday = d.add(diffToMonday + 6, "day").format("YYYY-MM-DD");
    const monthFirst = d.startOf("month").format("YYYY-MM-DD");
    const monthLast = d.endOf("month").format("YYYY-MM-DD");
    const todayStr = d.format("YYYY-MM-DD");

    return [
      { label: "오늘", start: todayStr, end: todayStr },
      { label: "이번 주", start: monday, end: sunday },
      { label: "이번 달", start: monthFirst, end: monthLast },
    ];
  }, []);

  const dateLabel =
    dateRange.startDate === dateRange.endDate
      ? dayjs(dateRange.startDate).format("M월 D일 (ddd)")
      : `${dayjs(dateRange.startDate).format("M/D")} ~ ${dayjs(dateRange.endDate).format("M/D")}`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
      {/* 좌측: 캘린더 + 공고 리스트 */}
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50">
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

        {/* 공고별 현황 */}
        {data && data.jobPostings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-muted-foreground">공고별 현황</h3>
              <span className="text-xs text-muted-foreground/60">{data.jobPostings.length}건</span>
            </div>
            <div className="space-y-1.5">
              {data.jobPostings.map((jp) => (
                <div
                  key={jp.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:bg-slate-100 ${expandedJobId === jp.id ? "bg-slate-100" : "bg-slate-50"}`}
                  onClick={() => setExpandedJobId(expandedJobId === jp.id ? null : jp.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{jp.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{dayjs(jp.startDate).format("M/D")} ~ {dayjs(jp.endDate).format("M/D")}</span>
                      {jp.location && <span>{jp.location}</span>}
                      {jp.workType && (
                        <span>{jp.workType === "online" ? "온라인" : "오프라인"}</span>
                      )}
                      {jp.platform && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {jp.platform}
                        </span>
                      )}
                    </div>
                  </div>
                  {expandedJobId === jp.id ? (
                    <ChevronLeft size={16} className="shrink-0 text-muted-foreground/50" />
                  ) : (
                    <ChevronRight size={16} className="shrink-0 text-muted-foreground/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 우측: 요약 */}
      <div className="space-y-6 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant={activePreset === preset.label ? "default" : "outline"}
                size="sm"
                onClick={() => handlePreset({ startDate: preset.start, endDate: preset.end })}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{dateLabel} 기준 현황</p>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : data ? (
          <>
            <DashboardSummary summary={data.summary} dateLabel={activePreset ?? dateLabel} />
            {(() => {
              const expandedJob = data.jobPostings.find((jp) => jp.id === expandedJobId);
              if (!expandedJob) {
                return (
                  <div className="rounded-xl bg-slate-50 py-8">
                    <p className="text-sm text-muted-foreground text-center">
                      {data.jobPostings.length === 0
                        ? "선택한 기간에 공고가 없습니다"
                        : "공고를 클릭하면 응시자 목록을 확인할 수 있습니다"}
                    </p>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/job-postings/${expandedJob.id}`}
                      className="group/link flex items-center gap-1 text-sm font-semibold hover:text-blue-600 transition-colors"
                    >
                      {expandedJob.title}
                      <ExternalLink size={13} className="text-muted-foreground group-hover/link:text-blue-600 transition-colors" />
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {expandedJob.workers.length}명 배정
                    </span>
                  </div>
                  {expandedJob.workers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">배정된 지원자가 없습니다</p>
                  ) : (
                    <div className="rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-xs text-muted-foreground">
                            <th className="px-3 py-2 text-left font-medium">이름</th>
                            <th className="px-3 py-2 text-left font-medium">연락처</th>
                            <th className="px-3 py-2 text-left font-medium">회의실</th>
                            <th className="px-3 py-2 text-left font-medium">출석</th>
                            <th className="px-3 py-2 text-left font-medium">계약</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {expandedJob.workers.map((w) => (
                            <tr key={w.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2">{w.name ?? "-"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{w.phone ?? "-"}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {w.roomSlots && w.roomSlots.length > 0
                                  ? [...new Set(w.roomSlots.map((s) => s.room))].join(", ")
                                  : "-"}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-xs ${w.attendanceStatus ? "text-green-600" : "text-muted-foreground"}`}>
                                  {w.attendanceStatus === "checked_in" ? "출석" : w.attendanceStatus === "confirmed" ? "확인" : "미출석"}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-xs ${w.contractStatus ? "text-blue-600" : "text-muted-foreground"}`}>
                                  {w.contractStatus === "signed" ? "서명" : w.contractStatus === "confirmed" ? "확인" : "미계약"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        ) : null}
      </div>
    </div>
  );
}
