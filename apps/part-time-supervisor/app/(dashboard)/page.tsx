"use client";

import { useState, useMemo, useCallback } from "react";
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
import { InterviewSummary } from "@/components/dashboard/InterviewSummary";

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="snow-kpi rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-16 rounded bg-white" />
                <div className="h-6 w-12 rounded bg-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="snow-panel rounded-xl p-4">
        <div className="mb-3 h-4 w-24 rounded bg-white" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-[#f9f9fa] p-4">
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
                    <div key={j} className="h-12 rounded-xl bg-white/70 p-2" />
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

  const { data, isLoading } = useDashboard(
    dateRange.startDate,
    dateRange.endDate,
  );

  const activePreset = useMemo(() => {
    const d = dayjs();
    const day = d.day();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = d.add(diffToMonday, "day").format("YYYY-MM-DD");
    const sunday = d.add(diffToMonday + 6, "day").format("YYYY-MM-DD");
    const monthFirst = d.startOf("month").format("YYYY-MM-DD");
    const monthLast = d.endOf("month").format("YYYY-MM-DD");
    const todayStr = d.format("YYYY-MM-DD");

    if (dateRange.startDate === todayStr && dateRange.endDate === todayStr)
      return "오늘";
    if (dateRange.startDate === monday && dateRange.endDate === sunday)
      return "이번 주";
    if (dateRange.startDate === monthFirst && dateRange.endDate === monthLast)
      return "이번 달";
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
    [],
  );

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
    [data?.jobPostings, selectedDateStr],
  );

  return (
    <div className="snow-page grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <DashboardCalendar
          dayMap={dayMap}
          selectedDate={selectedDate}
          displayMonth={displayMonth}
          onDisplayMonthChange={setDisplayMonth}
          onDateSelect={handleDateSelect}
          onPreset={handlePreset}
          activePreset={activePreset}
          dateLabel={dateLabel}
        />

        {data && filteredJobPostings.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
                  Jobs
                </p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">
                  공고별 현황
                </h3>
              </div>
              <span className="snow-pill rounded-full px-3 py-1 text-xs">
                {filteredJobPostings.length}건
              </span>
            </div>
            <div className="space-y-2">
              {filteredJobPostings.map((jp) => (
                <div
                  key={jp.id}
                  className={`relative cursor-pointer rounded-xl px-3 py-3 transition-all duration-200 ${
                    expandedJobId === jp.id
                      ? "bg-[#f1f1f1]"
                      : "bg-[#f9f9f9] hover:bg-[#f1f1f1]"
                  }`}
                  onClick={() =>
                    setExpandedJobId(expandedJobId === jp.id ? null : jp.id)
                  }
                >
                  <span
                    className={`snow-pill absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] ${
                      jp.type === "interview"
                        ? "bg-[#f9f9fa] text-slate-500"
                        : "bg-[#f9f9fa] text-slate-700"
                    }`}
                  >
                    {jp.type === "interview" ? "면접교육" : "감독관"}
                  </span>
                  <div className="flex min-w-0 items-center gap-3 pr-20">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                        jp.type === "interview"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block size-2 rounded-full ${
                          jp.type === "interview"
                            ? "bg-slate-300"
                            : "bg-slate-500"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {jp.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        <span>
                          {dayjs(jp.startDate).format("M/D")} ~{" "}
                          {dayjs(jp.endDate).format("M/D")}
                        </span>
                        {jp.type === "supervisor" && jp.location && (
                          <span>{jp.location}</span>
                        )}
                        {jp.type === "supervisor" && jp.workType && (
                          <span>
                            {jp.workType === "online" ? "온라인" : "오프라인"}
                          </span>
                        )}
                        {jp.platform && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                            {jp.platform}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={expandedJobId === jp.id ? "left" : "right"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="text-slate-400"
                      >
                        {expandedJobId === jp.id ? (
                          <ChevronLeft size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-6">
        {isLoading ? (
          <DashboardSkeleton />
        ) : data ? (
          <>
            <DashboardSummary
              summary={data.summary}
              dateLabel={activePreset ?? dateLabel}
              isFuture={dateRange.startDate > today.format("YYYY-MM-DD")}
            />
            {data.interview && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-600">
                  <span className="mr-1.5 inline-block size-2 rounded-full bg-slate-300 align-middle" />
                  면접교육 요약 현황
                </h3>
                <InterviewSummary interview={data.interview} />
                <div className="rounded-xl bg-[#f9f9fa] p-5 text-slate-900">
                  <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Monthly Total
                  </p>
                  <p className="text-2xl font-bold tabular-nums tracking-[-0.03em]">
                    ₩
                    {new Intl.NumberFormat("ko-KR").format(
                      (data.summary.totalEstimatedCost ?? 0) +
                        (data.interview.monthlyLaborCost ?? 0),
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    감독관과 면접교육 비용을 합산한 월간 예상치입니다.
                  </p>
                </div>
              </div>
            )}
            <AnimatePresence mode="wait">
              {(() => {
                const expandedJob = filteredJobPostings.find(
                  (jp) => jp.id === expandedJobId,
                );
                if (!expandedJob) {
                  return (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="snow-panel rounded-xl py-10"
                    >
                      <p className="text-center text-sm text-slate-500">
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
                    <div className="flex items-center justify-between px-1">
                      <Link
                        href={
                          expandedJob.type === "interview"
                            ? `/interview/job-postings/${expandedJob.id}`
                            : `/supervisor/job-postings/${expandedJob.id}`
                        }
                        className="group/link flex items-center gap-1 text-sm font-semibold text-slate-900 transition-colors hover:text-slate-600"
                      >
                        <span
                          className={`mr-1 inline-block size-1.5 rounded-full ${
                            expandedJob.type === "interview"
                              ? "bg-slate-300"
                              : "bg-slate-500"
                          }`}
                        />
                        {expandedJob.title}
                        <ExternalLink
                          size={13}
                          className="text-slate-400 transition-colors group-hover/link:text-slate-600"
                        />
                      </Link>
                      <span className="snow-pill rounded-full px-3 py-1 text-xs">
                        {expandedJob.type === "supervisor"
                          ? `${expandedJob.workers.length}명 배정`
                          : `${expandedJob.assignments.length}명 배정`}
                      </span>
                    </div>

                    {expandedJob.type === "supervisor" ? (
                      expandedJob.workers.length === 0 ? (
                        <div className="snow-panel rounded-xl py-8">
                          <p className="py-4 text-center text-sm text-slate-500">
                            배정된 지원자가 없습니다
                          </p>
                        </div>
                      ) : (
                        <div className="snow-panel overflow-hidden rounded-xl">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
                                <th className="px-3 py-2 text-left font-medium">
                                  이름
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  연락처
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  회의실
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  출석
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                  계약
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {expandedJob.workers.map((w) => (
                                <tr
                                  key={w.id}
                                  className="border-b border-slate-100 bg-white transition-colors last:border-b-0 hover:bg-slate-50"
                                >
                                  <td className="px-3 py-3 font-medium text-slate-800">
                                    {w.name ?? "-"}
                                  </td>
                                  <td className="px-3 py-3 text-slate-600">
                                    {w.phone ?? "-"}
                                  </td>
                                  <td className="px-3 py-3 text-slate-600">
                                    {w.roomSlots && w.roomSlots.length > 0
                                      ? [
                                          ...new Set(
                                            w.roomSlots.map((s) => s.room),
                                          ),
                                        ].join(", ")
                                      : "-"}
                                  </td>
                                  <td className="px-3 py-3">
                                    <span
                                      className={`text-xs ${w.attendanceStatus ? "text-slate-700" : "text-slate-400"}`}
                                    >
                                      {w.attendanceStatus === "checked_in"
                                        ? "출석"
                                        : w.attendanceStatus === "confirmed"
                                          ? "확인"
                                          : "미출석"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3">
                                    <span
                                      className={`text-xs ${w.contractStatus ? "text-slate-700" : "text-slate-400"}`}
                                    >
                                      {w.contractStatus === "signed"
                                        ? "서명"
                                        : w.contractStatus === "confirmed"
                                          ? "확인"
                                          : "미계약"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : expandedJob.assignments.length === 0 ? (
                      <div className="snow-panel rounded-xl py-8">
                        <p className="py-4 text-center text-sm text-slate-500">
                          배정된 인력이 없습니다
                        </p>
                      </div>
                    ) : (
                      <div className="snow-panel overflow-hidden rounded-xl">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
                              <th className="px-3 py-2 text-left font-medium">
                                이름
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                역할
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                급여유형
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                급여
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                상태
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {expandedJob.assignments.map((a) => (
                              <tr
                                key={a.id}
                                className="border-b border-slate-100 bg-white transition-colors last:border-b-0 hover:bg-slate-50"
                              >
                                <td className="px-3 py-3 font-medium text-slate-800">
                                  {a.name}
                                </td>
                                <td className="px-3 py-3 text-slate-600">
                                  {a.role === "rp"
                                    ? "RP"
                                    : a.role === "ft"
                                      ? "FT"
                                      : a.role === "instructor"
                                        ? "강사"
                                        : "기타"}
                                </td>
                                <td className="px-3 py-3 text-slate-600">
                                  {a.payType === "daily" ? "일급" : "시급"}
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums text-slate-800">
                                  ₩
                                  {new Intl.NumberFormat("ko-KR").format(
                                    a.payRate,
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <span
                                    className={`text-xs ${
                                      a.status === "completed"
                                        ? "text-slate-700"
                                        : a.status === "cancelled"
                                          ? "text-slate-500"
                                          : "text-slate-400"
                                    }`}
                                  >
                                    {a.status === "assigned"
                                      ? "배정"
                                      : a.status === "completed"
                                        ? "완료"
                                        : "취소"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
