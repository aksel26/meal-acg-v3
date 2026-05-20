"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { Badge } from "@repo/ui/src/badge";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
import { useActiveStatusMembers } from "@/hooks/useActiveStatusMembers";
import { useAttendanceToday } from "@/hooks/useAttendance";
import { useApprovals } from "@/hooks/useApprovals";
import { useDayoffs } from "@/hooks/useDayoffs";
import { useMemberStatuses } from "@/hooks/useMemberStatuses";
import {
  useSupervisorCalendar,
  useSupervisorCalendarByMonth,
} from "@/hooks/useSupervisorCalendar";
import { cn } from "@repo/ui/lib/utils";

import {
  AdminDashboardCalendar,
  type DayIndicator,
} from "@/components/dashboard/AdminDashboardCalendar";

dayjs.locale("ko");

// ── Types ──

interface DashboardStats {
  totalMembers: number;
}

type RoundStatus = "draft" | "confirmed" | "closed";

interface EvaluationRound {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: RoundStatus;
  is_deployed: boolean;
  config_version: number;
  updated_at: string;
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  "지각/조퇴": "bg-orange-50 text-orange-700",
  반차: "bg-purple-50 text-purple-700",
  연차: "bg-yellow-50 text-yellow-700",
  대체휴무: "bg-slate-100 text-slate-800",
  경조휴무: "bg-pink-50 text-pink-700",
  특별휴무: "bg-teal-50 text-teal-700",
  훈련: "bg-slate-50 text-slate-700",
  휴무: "bg-green-50 text-green-700",
};

// ── Detail Panel Sections ──

const accentDot: Record<string, string> = {
  purple: "bg-slate-900",
  orange: "bg-slate-700",
  emerald: "bg-slate-500",
  blue: "bg-slate-400",
};

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: "purple" | "orange" | "emerald" | "blue";
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[132px] rounded-xl bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", accentDot[accent])} />
        <p className="text-lg font-semibold leading-none text-slate-900">
          {title}
        </p>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function EmptyRow() {
  return <p className="py-1 text-sm text-slate-300">없음</p>;
}

function OperationQueueCard({
  href,
  label,
  value,
  suffix,
  description,
  isAttention,
}: {
  href: string;
  label: string;
  value: string | number;
  suffix?: string;
  description: string;
  isAttention?: boolean;
}) {
  return (
    <Link
      href={href}
      className="admin-pressable flex min-h-[112px] flex-col justify-between rounded-xl bg-white p-4 transition-colors hover:bg-slate-50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        {isAttention && <span className="h-2 w-2 rounded-full bg-slate-900" />}
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-[32px] font-semibold leading-none text-slate-950 tabular-nums">
            {value}
          </span>
          {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </Link>
  );
}

// ── Skeleton ──

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-16 rounded bg-white" />
                <div className="h-6 w-12 rounded bg-white" />
              </div>
              <div className="h-11 w-11 rounded-md bg-white" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-5">
            <div className="h-4 w-24 rounded bg-white mb-3" />
            <div className="h-16 rounded bg-white" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──

export default function DashboardPage() {
  const { checkSession } = useAuth();
  const today = dayjs();

  const [dateRange, setDateRange] = useState({
    startDate: today.format("YYYY-MM-DD"),
    endDate: today.format("YYYY-MM-DD"),
  });
  const [selectedDate, setSelectedDate] = useState(today.toDate());
  const [displayMonth, setDisplayMonth] = useState(today.toDate());

  const calendarYear = displayMonth.getFullYear();
  const calendarMonth = displayMonth.getMonth() + 1;
  const selectedDateStr = dayjs(selectedDate).format("YYYY-MM-DD");

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Preset Logic ──

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
  const currentDateStr = today.format("YYYY-MM-DD");

  // ── Calendar Data ──

  const { data: monthlyPostings } = useSupervisorCalendarByMonth(
    calendarYear,
    calendarMonth,
  );
  const { data: dayoffs = [] } = useDayoffs(calendarYear, calendarMonth);
  const { data: memberStatuses = [] } = useMemberStatuses({});
  const { data: supervisorData } = useSupervisorCalendar(selectedDateStr);

  const dayMap = useMemo(() => {
    const map = new Map<string, DayIndicator[]>();
    const svPostings = monthlyPostings?.jobPostings ?? [];
    const ivPostings = monthlyPostings?.interviewPostings ?? [];
    const start = dayjs(
      `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-01`,
    );
    const daysInMonth = start.daysInMonth();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const indicators: DayIndicator[] = [];

      // Dayoffs
      const dayDayoffs = dayoffs.filter((d) => d.leave_date === dateStr);
      for (const d of dayDayoffs) {
        indicators.push({
          id: d.id,
          title: `${d.target?.full_name ?? ""} ${d.leave_type?.name ?? ""}`,
          type: "dayoff",
        });
      }

      // Supervisor postings
      for (const jp of svPostings) {
        if (dateStr >= jp.start_date && dateStr <= jp.end_date) {
          indicators.push({ id: jp.id, title: jp.title, type: "supervisor" });
        }
      }

      // Interview postings
      for (const ip of ivPostings) {
        if (dateStr >= ip.start_date && dateStr <= ip.end_date) {
          indicators.push({ id: ip.id, title: ip.title, type: "interview" });
        }
      }

      if (indicators.length > 0) {
        map.set(dateStr, indicators);
      }
    }
    return map;
  }, [monthlyPostings, dayoffs, calendarYear, calendarMonth]);

  // ── Selected Date Detail ──

  const selectedDayoffs = useMemo(
    () => dayoffs.filter((d) => d.leave_date === selectedDateStr),
    [dayoffs, selectedDateStr],
  );

  const selectedStatuses = useMemo(() => {
    return memberStatuses.filter((s) => {
      if (!s.status_start_date) return false;
      const sEnd = s.status_end_date;
      return sEnd
        ? selectedDateStr >= s.status_start_date && selectedDateStr <= sEnd
        : selectedDateStr >= s.status_start_date;
    });
  }, [memberStatuses, selectedDateStr]);

  const jobPostings = supervisorData?.jobPostings ?? [];
  const interviewPostings = supervisorData?.interviewPostings ?? [];
  const dayOfWeekLabel = ["일", "월", "화", "수", "목", "금", "토"][
    dayjs(selectedDate).day()
  ];

  // ── KPI & Stats Queries ──

  const { data: attendanceToday } = useAttendanceToday();
  const { data: approvals } = useApprovals("pending");
  const pendingCount = approvals?.length || 0;

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.summary(calendarYear, calendarMonth),
    queryFn: async () => {
      const res = await fetch(
        `/api/stats/summary?year=${calendarYear}&month=${calendarMonth}`,
      );
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: statusMembers } = useActiveStatusMembers();
  const statusMemberCount = statusMembers?.length || 0;

  const { data: evaluationRounds = [] } = useQuery<EvaluationRound[]>({
    queryKey: queryKeys.evaluations.rounds,
    queryFn: async () => {
      const res = await fetch("/api/evaluations/rounds");
      if (!res.ok) throw new Error("Failed to fetch evaluation rounds");
      return res.json();
    },
  });

  const activeEvaluationRounds = useMemo(
    () =>
      evaluationRounds.filter(
        (round) =>
          round.is_deployed &&
          round.status !== "closed" &&
          currentDateStr >= round.start_date &&
          currentDateStr <= round.end_date,
      ),
    [evaluationRounds, currentDateStr],
  );

  const upcomingEvaluationRounds = useMemo(
    () =>
      evaluationRounds
        .filter(
          (round) =>
            round.status !== "closed" && currentDateStr < round.start_date,
        )
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(0, 3),
    [evaluationRounds, currentDateStr],
  );

  // ── Styles ──

  return (
    <div className="grid grid-cols-1 gap-6 pb-6 lg:grid-cols-[420px_1fr]">
      {/* ── Left Column: Calendar ── */}
      <div className="space-y-4">
        <AdminDashboardCalendar
          dayMap={dayMap}
          selectedDate={selectedDate}
          displayMonth={displayMonth}
          onDisplayMonthChange={setDisplayMonth}
          onDateSelect={handleDateSelect}
          onPreset={handlePreset}
          activePreset={activePreset}
          dateLabel={dateLabel}
        />
      </div>

      {/* ── Right Column: KPI + Cards ── */}
      <div className="min-w-0 space-y-5">
        {statsLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4 px-1">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  {dayOfWeekLabel}요일
                </p>
                <h1 className="mt-1 text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
                  {dayjs(selectedDate).format("M월 D일")}
                </h1>
              </div>
              <Link
                href="/organization"
                className="admin-pressable flex w-fit shrink-0 items-stretch rounded-xl bg-white px-5 py-4 text-center transition-colors hover:bg-slate-50"
              >
                <div className="min-w-[132px]">
                  <p className="text-sm font-medium text-slate-500">총 인원</p>
                  <p className="mt-1 text-3xl font-semibold leading-none text-slate-950 tabular-nums">
                    {stats?.totalMembers || 0}
                    <span className="ml-1 text-base font-medium text-slate-500">
                      명
                    </span>
                  </p>
                </div>
                <div className="mx-5 w-px bg-slate-200" />
                <div className="min-w-[152px]">
                  <p className="text-sm font-medium text-slate-500">
                    특이사항 인원
                  </p>
                  <p className="mt-1 text-3xl font-semibold leading-none text-slate-950 tabular-nums">
                    {statusMemberCount}
                    <span className="ml-1 text-base font-medium text-slate-500">
                      명
                    </span>
                  </p>
                </div>
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    오늘 처리할 일
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    승인, 출근 누락, 평가 진행 상태를 먼저 확인합니다.
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {today.format("YYYY.MM.DD")}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <OperationQueueCard
                  href="/approvals"
                  label="승인 대기"
                  value={pendingCount}
                  suffix="건"
                  description={
                    pendingCount > 0
                      ? "휴가/근무 신청을 확인하고 승인 또는 반려 처리합니다."
                      : "현재 승인 대기 건이 없습니다."
                  }
                  isAttention={pendingCount > 0}
                />
                <OperationQueueCard
                  href="/attendance"
                  label="출근 미확인"
                  value={attendanceToday?.notCheckedIn ?? 0}
                  suffix="명"
                  description={
                    attendanceToday?.notCheckedIn
                      ? `${attendanceToday.notCheckedInMembers
                          .slice(0, 3)
                          .map((m) => m.name)
                          .join(
                            ", ",
                          )}${attendanceToday.notCheckedIn > 3 ? " 외" : ""}`
                      : "오늘 출근 미확인 인원이 없습니다."
                  }
                  isAttention={(attendanceToday?.notCheckedIn ?? 0) > 0}
                />
                <OperationQueueCard
                  href="/evaluations"
                  label="진행 중 평가"
                  value={activeEvaluationRounds.length}
                  suffix="개"
                  description={
                    activeEvaluationRounds.length > 0
                      ? activeEvaluationRounds
                          .slice(0, 2)
                          .map((round) => round.name)
                          .join(", ")
                      : upcomingEvaluationRounds[0]
                        ? `${dayjs(
                            upcomingEvaluationRounds[0].start_date,
                          ).format("M/D")} 시작 예정`
                        : "진행 중이거나 예정된 평가가 없습니다."
                  }
                  isAttention={activeEvaluationRounds.length > 0}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
                <Section title="휴가 현황" accent="purple">
                  {selectedDayoffs.length === 0 ? (
                    <EmptyRow />
                  ) : (
                    selectedDayoffs.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between py-0.5"
                      >
                        <span className="text-sm text-slate-700">
                          {d.target?.full_name ?? "—"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {d.leave_type && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "h-5 px-1.5 py-0 text-xs",
                                LEAVE_TYPE_COLORS[d.leave_type.name] ||
                                  "bg-slate-50 text-slate-700",
                              )}
                            >
                              {d.leave_type.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </Section>

                <Section title="특이사항" accent="orange">
                  {selectedStatuses.length === 0 ? (
                    <EmptyRow />
                  ) : (
                    selectedStatuses.map((s) => (
                      <div
                        key={s.member_id}
                        className="flex items-center justify-between py-0.5"
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-sm text-slate-700">
                            {s.full_name ?? "—"}
                          </span>
                          {s.team_name && (
                            <span className="shrink-0 text-xs text-slate-400">
                              {s.team_name}
                            </span>
                          )}
                        </div>
                        <div className="ml-2 flex shrink-0 items-center gap-1.5">
                          {s.current_status && (
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 py-0 text-xs"
                            >
                              {s.current_status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </Section>

                <Section title="감독관 공고" accent="emerald">
                  {jobPostings.length === 0 ? (
                    <EmptyRow />
                  ) : (
                    jobPostings.map((jp) => (
                      <div
                        key={jp.id}
                        className="flex items-center justify-between py-0.5"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm text-slate-700">
                            {jp.title}
                          </span>
                          <span className="text-xs text-slate-400">
                            {jp.location || "—"}
                          </span>
                        </div>
                        <div className="ml-2 flex shrink-0 items-center gap-1.5">
                          <span className="text-xs text-slate-400">
                            {jp.assigned_count}/{jp.headcount}명
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "h-5 px-1.5 py-0 text-xs",
                              jp.status === "open" &&
                                "bg-green-50 text-green-700",
                              jp.status === "closed" &&
                                "bg-slate-100 text-slate-500",
                              jp.status === "draft" &&
                                "bg-yellow-50 text-yellow-600",
                            )}
                          >
                            {jp.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </Section>

                <Section title="교육운영 공고" accent="blue">
                  {interviewPostings.length === 0 ? (
                    <EmptyRow />
                  ) : (
                    interviewPostings.map((ip) => (
                      <div
                        key={ip.id}
                        className="flex items-center justify-between py-0.5"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm text-slate-700">
                            {ip.title}
                          </span>
                          <span className="text-xs text-slate-400">
                            {ip.platform || "-"}
                          </span>
                        </div>
                        <div className="ml-2 flex shrink-0 items-center gap-1.5">
                          <span className="text-xs text-slate-400">
                            {ip.total_headcount}명
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "h-5 px-1.5 py-0 text-xs",
                              ip.status === "open" &&
                                "bg-green-50 text-green-700",
                              ip.status === "closed" &&
                                "bg-slate-100 text-slate-500",
                              ip.status === "draft" &&
                                "bg-yellow-50 text-yellow-600",
                            )}
                          >
                            {ip.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </Section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
