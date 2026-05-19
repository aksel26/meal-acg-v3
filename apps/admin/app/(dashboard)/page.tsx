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
import { useBudgetSummary } from "@/hooks/useBudgetAllocations";
import { useAttendanceToday } from "@/hooks/useAttendance";
import { useApprovals } from "@/hooks/useApprovals";
import { useDayoffs } from "@/hooks/useDayoffs";
import { useMemberStatuses } from "@/hooks/useMemberStatuses";
import {
  useSupervisorCalendar,
  useSupervisorCalendarByMonth,
} from "@/hooks/useSupervisorCalendar";
import { STATUS_COLORS, SETTLEMENT_EXCLUDED_STATUSES } from "@/lib/constants";
import { cn } from "@repo/ui/lib/utils";

import {
  AdminDashboardCalendar,
  type DayIndicator,
} from "@/components/dashboard/AdminDashboardCalendar";
import { AdminDashboardSummary } from "@/components/dashboard/AdminDashboardSummary";

dayjs.locale("ko");

// ── Types ──

interface DashboardStats {
  totalMembers: number;
  totalAllowance: number;
  totalUsed: number;
  totalBalance: number;
  averageUsage: number;
}

interface SettlementData {
  totalMembers: number;
  settledCount: number;
  unsettledCount: number;
  settledMembers: { id: string; full_name: string }[];
  unsettledMembers: { id: string; full_name: string }[];
  month: string;
}

interface BudgetSummaryItem {
  allocation_id: string;
  member_id: string;
  member_name: string;
  member_role: string;
  team_name: string | null;
  type: string;
  total_amount: number;
  used_amount: number;
  remaining_amount: number;
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

// ── Helpers ──

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ko-KR").format(amount);

const formatCurrencyShort = (amount: number) => {
  if (amount >= 10000000) {
    return (
      <>
        {(amount / 10000000).toFixed(1)}
        <span className="text-xs text-slate-500">천만</span>
      </>
    );
  }
  if (amount >= 10000) {
    return (
      <>
        {(amount / 10000).toFixed(1)}
        <span className="text-xs text-slate-500">만</span>
      </>
    );
  }
  return formatCurrency(amount);
};

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-100">
      <div
        className="h-full rounded-sm bg-slate-900 transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

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
    <div className="rounded-lg bg-white px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", accentDot[accent])} />
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </p>
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function EmptyRow() {
  return <p className="py-0.5 text-xs text-slate-300">없음</p>;
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
        ? selectedDateStr >= s.status_start_date &&
            selectedDateStr <= sEnd
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

  const excludedMemberNames = useMemo(
    () =>
      new Set(
        statusMembers
          ?.filter(
            (m) =>
              m.current_status &&
              SETTLEMENT_EXCLUDED_STATUSES.has(m.current_status),
          )
          .map((m) => m.full_name) || [],
      ),
    [statusMembers],
  );

  const { data: settlement } = useQuery<SettlementData>({
    queryKey: queryKeys.dashboard.settlement(calendarYear, calendarMonth),
    queryFn: async () => {
      const res = await fetch(
        `/api/stats/settlement?year=${calendarYear}&month=${calendarMonth}`,
      );
      if (!res.ok) throw new Error("Failed to fetch settlement");
      return res.json();
    },
  });

  // ── Budget ──

  const budgetPeriod = useMemo(() => {
    const half = calendarMonth <= 6 ? "H1" : "H2";
    return `${calendarYear}-${half}`;
  }, [calendarYear, calendarMonth]);

  const { data: budgetData } = useBudgetSummary(budgetPeriod);

  const pointsSummary = useMemo(() => {
    const items: BudgetSummaryItem[] = Array.isArray(budgetData)
      ? budgetData
      : [];
    const welfare = { total: 0, used: 0, remaining: 0, memberCount: 0 };
    const activity = { total: 0, used: 0, remaining: 0, memberCount: 0 };

    for (const item of items) {
      if (item.type === "복지포인트") {
        welfare.total += item.total_amount || 0;
        welfare.used += item.used_amount || 0;
        welfare.remaining += item.remaining_amount || 0;
        welfare.memberCount++;
      } else if (item.type === "활동비") {
        activity.total += item.total_amount || 0;
        activity.used += item.used_amount || 0;
        activity.remaining += item.remaining_amount || 0;
        activity.memberCount++;
      }
    }
    return { welfare, activity };
  }, [budgetData]);

  const usageRate = stats?.totalAllowance
    ? ((stats.totalUsed || 0) / stats.totalAllowance) * 100
    : 0;
  const welfareUsageRate =
    pointsSummary.welfare.total > 0
      ? (pointsSummary.welfare.used / pointsSummary.welfare.total) * 100
      : 0;
  const activityUsageRate =
    pointsSummary.activity.total > 0
      ? (pointsSummary.activity.used / pointsSummary.activity.total) * 100
      : 0;

  // ── Styles ──

  const cardClass =
    "admin-pressable rounded-xl bg-white p-5 transition-colors hover:bg-slate-50";
  const rowClass =
    "flex items-center justify-between py-2";

  return (
    <div className="grid grid-cols-1 gap-6 pb-6 lg:grid-cols-[420px_1fr]">
      {/* ── Left Column: Calendar + Detail ── */}
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

        {/* Selected Date Detail */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-1.5 px-1">
            <span className="text-base font-semibold text-slate-800">
              {dayjs(selectedDate).format("M월 D일")}
            </span>
            <span className="text-xs text-slate-400">{dayOfWeekLabel}요일</span>
          </div>

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
                        jp.status === "open" && "bg-green-50 text-green-700",
                        jp.status === "closed" && "bg-slate-100 text-slate-500",
                        jp.status === "draft" && "bg-yellow-50 text-yellow-600",
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
                        ip.status === "open" && "bg-green-50 text-green-700",
                        ip.status === "closed" && "bg-slate-100 text-slate-500",
                        ip.status === "draft" && "bg-yellow-50 text-yellow-600",
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

      {/* ── Right Column: KPI + Cards ── */}
      <div className="min-w-0 space-y-5">
        {statsLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* KPI Summary */}
            <AdminDashboardSummary
              totalMembers={stats?.totalMembers || 0}
              checkedIn={attendanceToday?.checkedIn || 0}
              notCheckedIn={attendanceToday?.notCheckedIn || 0}
              onLeave={attendanceToday?.onLeave || 0}
              pendingApprovals={pendingCount}
              usageRate={Math.round(usageRate)}
            />

            {/* Attendance + Approvals */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* 오늘의 근태 */}
              <Link href="/attendance" className={cardClass}>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                  오늘의 근태
                </h4>
                {attendanceToday ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="rounded-sm bg-slate-50 px-3 py-2 text-center">
                        <p className="text-lg font-bold tabular-nums text-slate-900">
                          {attendanceToday.checkedIn}
                        </p>
                        <p className="text-[11px] text-slate-500">출근</p>
                      </div>
                      <div className="rounded-sm bg-slate-50 px-3 py-2 text-center">
                        <p className="text-lg font-bold tabular-nums text-slate-700">
                          {attendanceToday.notCheckedIn}
                        </p>
                        <p className="text-[11px] text-slate-500">미출근</p>
                      </div>
                      <div className="rounded-sm bg-slate-50 px-3 py-2 text-center">
                        <p className="text-lg font-bold tabular-nums text-slate-900">
                          {attendanceToday.late}
                        </p>
                        <p className="text-[11px] text-slate-500">지각</p>
                      </div>
                      <div className="rounded-sm bg-slate-50 px-3 py-2 text-center">
                        <p className="text-lg font-bold tabular-nums text-slate-900">
                          {attendanceToday.onLeave}
                        </p>
                        <p className="text-[11px] text-slate-500">휴가</p>
                      </div>
                    </div>
                    {attendanceToday.lateMembers.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        <span className="text-[11px] text-slate-400">
                          지각:
                        </span>
                        {attendanceToday.lateMembers.map((m) => (
                          <span
                            key={m.id}
                            className="rounded-sm bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                          >
                            {m.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-16 animate-pulse rounded bg-slate-100" />
                )}
              </Link>

              {/* 승인 대기 */}
              <Link href="/approvals" className={cardClass}>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                  승인 대기
                </h4>
                {approvals ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold tabular-nums text-slate-900">
                        {pendingCount}
                      </span>
                      <span className="text-sm text-slate-500">건 대기 중</span>
                    </div>
                    {pendingCount > 0 && (
                      <div className="space-y-1 pt-2">
                        {approvals.slice(0, 5).map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between rounded-md bg-slate-50/80 px-2.5 py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-700">
                                {a.requester?.full_name || "알 수 없음"}
                              </span>
                              {a.related_data?.leave_type && (
                                <span className="text-[11px] text-slate-400">
                                  {a.related_data.leave_type.name}
                                </span>
                              )}
                            </div>
                            {a.related_data && (
                              <span className="text-[11px] tabular-nums text-slate-400">
                                {dayjs(a.related_data.leave_date).format(
                                  "MM/DD",
                                )}
                              </span>
                            )}
                          </div>
                        ))}
                        {pendingCount > 5 && (
                          <p className="text-center text-[11px] text-slate-400">
                            외 {pendingCount - 5}건
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-16 animate-pulse rounded bg-slate-100" />
                )}
              </Link>
            </div>

            {/* Organization + Settlement + Budget */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {/* Col 1: 총 인원 */}
              <Link href="/organization" className={cardClass}>
                <div className="mb-1.5">
                  <h3 className="text-base font-semibold text-slate-800">
                    총 인원
                  </h3>
                </div>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums text-slate-900">
                    {stats?.totalMembers || 0}
                  </span>
                  <span className="text-base text-slate-400">명</span>
                </div>
                <div className="space-y-1.5 pt-2.5">
                  <div className="flex items-center justify-between rounded-md bg-slate-50/80 px-3 py-1.5">
                    <span className="text-sm text-slate-500">정상 근무</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-700">
                      {(stats?.totalMembers || 0) - statusMemberCount}명
                    </span>
                  </div>
                  {statusMemberCount > 0 && (
                    <div className="flex items-center justify-between rounded-md bg-slate-50/80 px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">
                          특이사항
                        </span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-slate-700">
                        {statusMemberCount}명
                      </span>
                    </div>
                  )}
                </div>
                {statusMembers && statusMembers.length > 0 && (
                  <div className="mt-3 pt-3">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {Object.entries(
                        statusMembers.reduce<Record<string, number>>(
                          (acc, m) => {
                            const status = m.current_status || "기타";
                            acc[status] = (acc[status] || 0) + 1;
                            return acc;
                          },
                          {},
                        ),
                      ).map(([status, count]) => (
                        <span
                          key={status}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            STATUS_COLORS[status] ||
                              "bg-slate-50 text-slate-600",
                          )}
                        >
                          {status} {count}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-0.5">
                      {statusMembers.map((m) => (
                        <div
                          key={m.member_id}
                          className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-slate-50"
                        >
                          <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                            {m.full_name}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                              STATUS_COLORS[m.current_status || ""] ||
                                "bg-slate-50 text-slate-600",
                            )}
                          >
                            {m.current_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Link>

              {/* Col 2: 정산 현황 */}
              <Link href="/meal-status" className={cardClass}>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                  정산 현황
                </h4>
                {(() => {
                  const filteredUnsettled =
                    settlement?.unsettledMembers?.filter(
                      (m) => !excludedMemberNames.has(m.full_name),
                    ) || [];
                  const filteredUnsettledCount = filteredUnsettled.length;
                  const excludedCount =
                    (settlement?.unsettledCount || 0) - filteredUnsettledCount;
                  return (
                    <>
                      <div className="flex items-baseline gap-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold tabular-nums text-slate-900">
                            {settlement?.settledCount || 0}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            완료
                          </span>
                        </div>
                        <span className="text-slate-300">/</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold tabular-nums text-slate-900">
                            {filteredUnsettledCount}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            미정산
                          </span>
                        </div>
                      </div>
                      {excludedCount > 0 && (
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          특이사항 {excludedCount}명 제외
                        </p>
                      )}
                      {filteredUnsettled.length > 0 && (
                        <div className="mt-2 pt-2">
                          <div className="flex flex-wrap gap-1">
                            {[...filteredUnsettled]
                              .sort((a, b) =>
                                a.full_name.localeCompare(b.full_name, "ko"),
                              )
                              .map((m) => (
                                <span
                                  key={m.id}
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                                >
                                  {m.full_name}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </Link>

              {/* Col 3: 비용 통계 */}
              <div className="flex flex-col gap-3">
                {/* 식대 */}
                <Link href="/meal-status" className={cardClass}>
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-slate-800">
                      식대
                    </h3>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      사용률
                    </p>
                    <p className="text-3xl font-bold tabular-nums text-slate-900">
                      {usageRate.toFixed(0)}
                      <span className="text-lg text-slate-500">%</span>
                    </p>
                  </div>
                  <div className="mt-3">
                    <ProgressBar percent={usageRate} />
                  </div>
                  <div className="mt-3">
                    <div className={rowClass}>
                      <span className="text-sm text-slate-500">지원금</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatCurrencyShort(stats?.totalAllowance || 0)}
                      </span>
                    </div>
                    <div className={rowClass}>
                      <span className="text-sm text-slate-500">사용액</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatCurrencyShort(stats?.totalUsed || 0)}
                      </span>
                    </div>
                    <div className={rowClass}>
                      <span className="text-sm text-slate-500">잔여</span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          (stats?.totalBalance || 0) >= 0
                            ? "text-slate-900"
                            : "text-rose-600",
                        )}
                      >
                        {formatCurrencyShort(stats?.totalBalance || 0)}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* 복지포인트 */}
                <Link href="/points-overview" className={cardClass}>
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-800">
                        복지포인트
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {budgetPeriod}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      사용률
                      <span className="ml-1 text-xs text-slate-400">
                        {pointsSummary.welfare.memberCount}명
                      </span>
                    </p>
                    <p className="text-3xl font-bold tabular-nums text-slate-900">
                      {welfareUsageRate.toFixed(0)}
                      <span className="text-lg text-slate-500">%</span>
                    </p>
                  </div>
                  <div className="mt-3">
                    <ProgressBar percent={welfareUsageRate} />
                  </div>
                  <div className="mt-3">
                    <div className={rowClass}>
                      <span className="text-sm text-slate-500">할당</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatCurrencyShort(pointsSummary.welfare.total)}
                      </span>
                    </div>
                    <div className={rowClass}>
                      <span className="text-sm text-slate-500">사용</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatCurrencyShort(pointsSummary.welfare.used)}
                      </span>
                    </div>
                    <div className={rowClass}>
                      <span className="text-sm text-slate-500">잔여</span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          pointsSummary.welfare.remaining < 0
                            ? "text-rose-600"
                            : "text-slate-900",
                        )}
                      >
                        {formatCurrencyShort(pointsSummary.welfare.remaining)}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* 활동비 */}
                <Link href="/points-overview" className={cardClass}>
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-800">
                        활동비
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {budgetPeriod}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      사용률
                      <span className="ml-1 text-xs text-slate-400">
                        {pointsSummary.activity.memberCount}명
                      </span>
                    </p>
                    <p className="text-3xl font-bold tabular-nums text-slate-900">
                      {activityUsageRate.toFixed(0)}
                      <span className="text-lg text-slate-500">%</span>
                    </p>
                  </div>
                  <div className="mt-3">
                    <ProgressBar percent={activityUsageRate} />
                  </div>
                  <div className="mt-3">
                    <div className={rowClass}>
                      <span className="text-sm text-slate-500">할당</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatCurrencyShort(pointsSummary.activity.total)}
                      </span>
                    </div>
                    <div className={rowClass}>
                      <span className="text-sm text-slate-500">사용</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatCurrencyShort(pointsSummary.activity.used)}
                      </span>
                    </div>
                    <div className={rowClass}>
                      <span className="text-sm text-slate-500">잔여</span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          pointsSummary.activity.remaining < 0
                            ? "text-rose-600"
                            : "text-slate-900",
                        )}
                      >
                        {formatCurrencyShort(pointsSummary.activity.remaining)}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
