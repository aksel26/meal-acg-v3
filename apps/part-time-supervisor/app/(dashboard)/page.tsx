"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@repo/ui/src/button";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { ChevronRight, ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

dayjs.locale("ko");
import { useDashboard } from "@/hooks/use-dashboard";
import { useDashboardCalendar } from "@/hooks/use-dashboard-calendar";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { JobPostingGrid } from "@/components/dashboard/JobPostingGrid";
import { InterviewSummary } from "@/components/dashboard/InterviewSummary";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-white" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-16 rounded bg-white" />
                <div className="h-6 w-12 rounded bg-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-white" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-1.5">
                    <div className="h-5 w-40 rounded bg-white" />
                    <div className="h-3 w-56 rounded bg-white" />
                  </div>
                  <div className="h-5 w-14 rounded-full bg-white" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="rounded-lg bg-white/50 p-2 h-12" />
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

  const selectedDateStr = dayjs(selectedDate).format("YYYY-MM-DD");
  const filteredJobPostings = useMemo(
    () =>
      (data?.jobPostings ?? [])
        .filter((jp) => jp.endDate >= selectedDateStr)
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [data?.jobPostings, selectedDateStr]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
      {/* 좌측: 캘린더 + 공고 리스트 */}
      <div className="space-y-4">
        <div className="rounded-xl bg-white">
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
        {data && filteredJobPostings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-muted-foreground">공고별 현황</h3>
              <span className="text-xs text-muted-foreground/60">{filteredJobPostings.length}건</span>
            </div>
            <div className="space-y-2">
              {filteredJobPostings.map((jp) => (
                <div
                  key={jp.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:bg-slate-100 ${expandedJobId === jp.id ? "bg-slate-100" : "bg-white"}`}
                  onClick={() => setExpandedJobId(expandedJobId === jp.id ? null : jp.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span className={`inline-block size-1.5 rounded-full mr-1.5 align-middle ${
                        jp.type === "interview" ? "bg-amber-500" : "bg-blue-500"
                      }`} />
                      {jp.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{dayjs(jp.startDate).format("M/D")} ~ {dayjs(jp.endDate).format("M/D")}</span>
                      {jp.type === "supervisor" && jp.location && <span>{jp.location}</span>}
                      {jp.type === "supervisor" && jp.workType && (
                        <span>{jp.workType === "online" ? "온라인" : "오프라인"}</span>
                      )}
                      {jp.platform && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {jp.platform}
                        </span>
                      )}
                    </div>
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={expandedJobId === jp.id ? "left" : "right"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="shrink-0 text-muted-foreground/50"
                    >
                      {expandedJobId === jp.id ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </motion.span>
                  </AnimatePresence>
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
            <DashboardSummary
              summary={data.summary}
              dateLabel={activePreset ?? dateLabel}
              isFuture={dateRange.startDate > today.format("YYYY-MM-DD")}
            />
            {/* 면접교육 요약 */}
            {data.interview && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  <span className="inline-block size-2 rounded-full bg-amber-500 mr-1.5 align-middle" />
                  면접교육 요약 현황
                </h3>
                <InterviewSummary interview={data.interview} />
                {/* 합산 카드 */}
                <div className="rounded-xl bg-slate-900 p-4 text-white">
                  <p className="text-xs text-slate-400 mb-1">이번달 총 비용 (감독관 + 면접교육)</p>
                  <p className="text-2xl font-bold tabular-nums">
                    ₩{new Intl.NumberFormat("ko-KR").format(
                      (data.summary.totalEstimatedCost ?? 0) + (data.interview.monthlyLaborCost ?? 0)
                    )}
                  </p>
                </div>
              </div>
            )}
            <AnimatePresence mode="wait">
              {(() => {
                const expandedJob = filteredJobPostings.find((jp) => jp.id === expandedJobId);
                if (!expandedJob) {
                  return (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="rounded-xl bg-white py-8"
                    >
                      <p className="text-sm text-muted-foreground text-center">
                        {filteredJobPostings.length === 0
                          ? "선택한 기간에 공고가 없습니다"
                          : "공고를 클릭하면 응시자 목록을 확인할 수 있습니다"}
                      </p>
                    </motion.div>
                  );
                }
                return (
                  <motion.div
                    key={expandedJob.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={expandedJob.type === "interview"
                          ? `/interview/job-postings/${expandedJob.id}`
                          : `/supervisor/job-postings/${expandedJob.id}`
                        }
                        className="group/link flex items-center gap-1 text-sm font-semibold hover:text-blue-600 transition-colors"
                      >
                        <span className={`inline-block size-1.5 rounded-full mr-1 ${
                          expandedJob.type === "interview" ? "bg-amber-500" : "bg-blue-500"
                        }`} />
                        {expandedJob.title}
                        <ExternalLink size={13} className="text-muted-foreground group-hover/link:text-blue-600 transition-colors" />
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {expandedJob.type === "supervisor"
                          ? `${expandedJob.workers.length}명 배정`
                          : `${expandedJob.assignments.length}명 배정`
                        }
                      </span>
                    </div>
                    {expandedJob.type === "supervisor" ? (
                      expandedJob.workers.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">배정된 지원자가 없습니다</p>
                      ) : (
                        <div className="rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-white text-xs text-muted-foreground">
                                <th className="px-3 py-2 text-left font-medium">이름</th>
                                <th className="px-3 py-2 text-left font-medium">연락처</th>
                                <th className="px-3 py-2 text-left font-medium">회의실</th>
                                <th className="px-3 py-2 text-left font-medium">출석</th>
                                <th className="px-3 py-2 text-left font-medium">계약</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/80">
                              {expandedJob.workers.map((w) => (
                                <tr key={w.id} className="hover:bg-slate-50 bg-white">
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
                      )
                    ) : (
                      expandedJob.assignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">배정된 인력이 없습니다</p>
                      ) : (
                        <div className="rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-white text-xs text-muted-foreground">
                                <th className="px-3 py-2 text-left font-medium">이름</th>
                                <th className="px-3 py-2 text-left font-medium">역할</th>
                                <th className="px-3 py-2 text-left font-medium">급여유형</th>
                                <th className="px-3 py-2 text-right font-medium">급여</th>
                                <th className="px-3 py-2 text-left font-medium">상태</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/80">
                              {expandedJob.assignments.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50 bg-white">
                                  <td className="px-3 py-2">{a.name}</td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    {a.role === "rp" ? "RP" : a.role === "ft" ? "FT" : a.role === "instructor" ? "강사" : "기타"}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    {a.payType === "daily" ? "일급" : "시급"}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums text-xs">
                                    ₩{new Intl.NumberFormat("ko-KR").format(a.payRate)}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`text-xs ${
                                      a.status === "completed" ? "text-green-600" :
                                      a.status === "cancelled" ? "text-red-500" :
                                      "text-muted-foreground"
                                    }`}>
                                      {a.status === "assigned" ? "배정" : a.status === "completed" ? "완료" : "취소"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </>
        ) : null}
      </div>
    </div>
  );
}
