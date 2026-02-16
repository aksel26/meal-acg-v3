"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
import { useActiveStatusMembers } from "@/hooks/useActiveStatusMembers";
import { useBudgetSummary } from "@/hooks/useBudgetAllocations";
import { STATUS_COLORS, SETTLEMENT_EXCLUDED_STATUSES } from "@/lib/constants";
import { cn } from "@repo/ui/lib/utils";

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

interface LunchGroupMember {
  user_id: string;
  member: { id: string; full_name: string };
}

interface LunchGroup {
  id: string;
  group_number: number;
  week_start_date: string;
  max_slots: number;
  members: LunchGroupMember[];
}

interface MemberSpendingData {
  members: {
    id: string;
    name: string;
    totalUsed: number;
    totalAllowance: number;
    excess: number;
    usageRate: number;
  }[];
  average: number;
  totalMembers: number;
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

const getWeekStartDate = (date: dayjs.Dayjs) => {
  const day = date.day();
  const diff = day === 0 ? -6 : 1 - day;
  return date.add(diff, "day").format("YYYY-MM-DD");
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ko-KR").format(amount);
};

const formatCurrencyShort = (amount: number) => {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)}천만`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(1)}만`;
  }
  return formatCurrency(amount);
};

// ── Progress Bar ──
function ProgressBar({
  percent,
}: {
  percent: number;
}) {
  const clamped = Math.min(Math.max(percent, 0), 100);

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

// ── Main ──

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const { checkSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDate = dayjs();

  const initialYear = searchParams.get("year");
  const initialMonth = searchParams.get("month");

  const [selectedYear, setSelectedYear] = useState(() =>
    initialYear ? parseInt(initialYear) : currentDate.year()
  );
  const [selectedMonth, setSelectedMonth] = useState(() =>
    initialMonth ? parseInt(initialMonth) : currentDate.month() + 1
  );
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const updateURL = useCallback(
    (year: number, month: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", year.toString());
      params.set("month", month.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    if (year) setSelectedYear(parseInt(year));
    if (month) setSelectedMonth(parseInt(month));
  }, [searchParams]);

  useEffect(() => {
    checkSession();
  }, []);

  // ── 반기 period 계산 ──
  const budgetPeriod = useMemo(() => {
    const half = selectedMonth <= 6 ? "H1" : "H2";
    return `${selectedYear}-${half}`;
  }, [selectedYear, selectedMonth]);

  // ── Queries ──

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.summary(selectedYear, selectedMonth),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/summary?year=${selectedYear}&month=${selectedMonth}`
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
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
              SETTLEMENT_EXCLUDED_STATUSES.has(m.current_status)
          )
          .map((m) => m.full_name) || []
      ),
    [statusMembers]
  );

  const { data: settlement } = useQuery<SettlementData>({
    queryKey: queryKeys.dashboard.settlement(selectedYear, selectedMonth),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/settlement?year=${selectedYear}&month=${selectedMonth}`
      );
      if (!response.ok) throw new Error("Failed to fetch settlement");
      return response.json();
    },
  });

  const selectedWeekDate = currentDate.add(weekOffset, "week");
  const weekStartDate = getWeekStartDate(selectedWeekDate);
  const weekEndDate = dayjs(weekStartDate).add(4, "day").format("MM/DD");
  const weekStartDisplay = dayjs(weekStartDate).format("MM/DD");

  const { data: lunchGroups } = useQuery<LunchGroup[]>({
    queryKey: queryKeys.lunchGroups.byWeek(weekStartDate),
    queryFn: async () => {
      const response = await fetch(
        `/api/lunch-groups?weekStartDate=${weekStartDate}`
      );
      if (!response.ok) throw new Error("Failed to fetch lunch groups");
      return response.json();
    },
  });

  const { data: memberSpending } = useQuery<MemberSpendingData>({
    queryKey: queryKeys.dashboard.memberSpending(selectedYear, selectedMonth),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/member-spending?year=${selectedYear}&month=${selectedMonth}`
      );
      if (!response.ok) throw new Error("Failed to fetch member spending");
      return response.json();
    },
  });

  // ── 포인트 데이터 (budget_summary) ──
  const { data: budgetData } = useBudgetSummary(budgetPeriod);

  const pointsSummary = useMemo(() => {
    const items: BudgetSummaryItem[] = Array.isArray(budgetData)
      ? budgetData
      : [];
    const welfare = {
      total: 0,
      used: 0,
      remaining: 0,
      memberCount: 0,
    };
    const activity = {
      total: 0,
      used: 0,
      remaining: 0,
      memberCount: 0,
    };

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

  // ── Derived ──

  const years = useMemo(
    () => Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i),
    [currentDate]
  );
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    []
  );

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

  const cardClass =
    "block rounded-xl bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)]";
  const rowClass =
    "flex items-center justify-between border-t border-slate-100 py-2.5";

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* ── Date Selector ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            onClick={() => {
              setIsYearOpen(!isYearOpen);
              setIsMonthOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {selectedYear}년
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                isYearOpen && "rotate-180"
              )}
            />
          </button>
          {isYearOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-32 rounded-lg bg-white p-1 shadow-lg ring-1 ring-slate-200/60">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year);
                    setIsYearOpen(false);
                    updateURL(year, selectedMonth);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-2 text-base transition-colors",
                    year === selectedYear
                      ? "bg-blue-50 font-medium text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {year}년
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setIsMonthOpen(!isMonthOpen);
              setIsYearOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {selectedMonth}월
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                isMonthOpen && "rotate-180"
              )}
            />
          </button>
          {isMonthOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 grid w-48 grid-cols-4 gap-1 rounded-lg bg-white p-2 shadow-lg ring-1 ring-slate-200/60">
              {months.map((month) => (
                <button
                  key={month}
                  onClick={() => {
                    setSelectedMonth(month);
                    setIsMonthOpen(false);
                    updateURL(selectedYear, month);
                  }}
                  className={cn(
                    "flex items-center justify-center rounded-md py-2 text-base transition-colors",
                    month === selectedMonth
                      ? "bg-blue-50 font-medium text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {month}월
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto text-base text-slate-500">
          {selectedYear}년 {selectedMonth}월 현황
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          2-Column Layout: 인원/점심조 (left) | 비용 통계 (right)
          ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* ── Col 1: 총 인원 + 점심조 ── */}
        <div className="flex flex-col gap-3">
          {/* 총 인원 */}
          <Link href="/member-status" className={cardClass}>
            <div className="mb-1.5">
              <h3 className="text-base font-semibold text-slate-800">총 인원</h3>
            </div>
            <div className="mb-3 flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-9 w-16 animate-pulse rounded bg-slate-100" />
              ) : (
                <>
                  <span className="text-4xl font-bold tabular-nums text-slate-900">
                    {stats?.totalMembers || 0}
                  </span>
                  <span className="text-base text-slate-400">명</span>
                </>
              )}
            </div>
            <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
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
                    <span className="text-sm font-semibold text-slate-700">특이사항</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-slate-700">
                    {statusMemberCount}명
                  </span>
                </div>
              )}
            </div>
            {statusMembers && statusMembers.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {Object.entries(
                    statusMembers.reduce<Record<string, number>>((acc, m) => {
                      const status = m.current_status || "기타";
                      acc[status] = (acc[status] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([status, count]) => (
                    <span
                      key={status}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        STATUS_COLORS[status] ||
                          "bg-slate-50 text-slate-600 border-slate-200"
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
                          "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                          STATUS_COLORS[m.current_status || ""] ||
                            "bg-slate-50 text-slate-600 border-slate-200"
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

          {/* 점심조 */}
          <Link href="/lunch-groups" className={cardClass}>
            <div className="mb-1.5">
              <h3 className="text-base font-semibold text-slate-800">점심조</h3>
            </div>
            <div className="mb-1.5 flex items-center justify-between">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWeekOffset((prev) => prev - 1); }}
                className="rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium tabular-nums text-slate-600">
                  {weekStartDisplay} ~ {weekEndDate}
                </span>
                {weekOffset === 0 && (
                  <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    이번주
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWeekOffset((prev) => prev + 1); }}
                className="rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {lunchGroups && lunchGroups.length > 0 ? (
                lunchGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-2.5 rounded-md bg-slate-50/80 px-3 py-1.5"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[11px] font-bold text-slate-700">
                      {group.group_number}
                    </span>
                    <div className="min-w-0 flex-1 truncate text-sm text-slate-600">
                      {group.members.map((m) => m.member.full_name).join(", ") ||
                        "미배정"}
                    </div>
                    <span className="text-xs font-medium tabular-nums text-slate-400">
                      {group.members.length}/{group.max_slots}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">
                  {weekOffset === 0 ? "이번 주" : "해당 주"} 점심조가 없습니다
                </p>
              )}
            </div>
          </Link>
        </div>

        {/* ── Col 2: 정산 + 초과액 ── */}
        <div className="flex flex-col gap-3">
          {/* 정산 현황 */}
          <Link href="/meal-status" className={cardClass}>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">
              정산 현황
            </h4>
            {(() => {
              const filteredUnsettled =
                settlement?.unsettledMembers?.filter(
                  (m) => !excludedMemberNames.has(m.full_name)
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
                      <span className="text-[11px] text-slate-400">완료</span>
                    </div>
                    <span className="text-slate-300">/</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tabular-nums text-slate-900">
                        {filteredUnsettledCount}
                      </span>
                      <span className="text-[11px] text-slate-400">미정산</span>
                    </div>
                  </div>
                  {excludedCount > 0 && (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      특이사항 {excludedCount}명 제외
                    </p>
                  )}
                  {filteredUnsettled.length > 0 && (
                    <div className="mt-2 border-t border-slate-100 pt-2">
                      <div className="flex flex-wrap gap-1">
                        {[...filteredUnsettled]
                          .sort((a, b) =>
                            a.full_name.localeCompare(b.full_name, "ko")
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

          {/* 초과액 현황 */}
          <Link href="/meal-status" className={cardClass}>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">
              초과액 현황
            </h4>
            <div className="space-y-0.5">
              {memberSpending?.members &&
              memberSpending.members.length > 0 ? (
                memberSpending.members.map((member, idx) => (
                  <div
                    key={member.id}
                    className="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-slate-50"
                  >
                    <span
                      className={cn(
                        "flex h-4.5 w-4.5 items-center justify-center rounded text-[10px] font-bold",
                        idx < 3
                          ? "bg-slate-800 text-white"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {idx + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 group-hover:text-slate-900">
                      {member.name}
                    </p>
                    <span className="text-xs font-semibold tabular-nums text-slate-900">
                      +{formatCurrency(member.excess)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">
                  초과액이 없습니다
                </p>
              )}
            </div>
          </Link>
        </div>

        {/* ── Col 3: 비용 통계 (식대 + 복지포인트 + 활동비) ── */}
        <div className="flex flex-col gap-3">
          {/* 식대 현황 */}
          <Link href="/meal-status" className={cardClass}>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-slate-800">식대</h3>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-sm font-medium text-slate-500">사용률</p>
              <p className="text-3xl font-bold tabular-nums text-slate-900">
                {usageRate.toFixed(0)}%
              </p>
            </div>
            <div className="mt-3">
              <ProgressBar percent={usageRate} />
            </div>
            <div className="mt-3">
              <div className={rowClass}>
                <span className="text-sm text-slate-500">지원금</span>
                {isLoading ? (
                  <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
                ) : (
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatCurrencyShort(stats?.totalAllowance || 0)}
                  </span>
                )}
              </div>
              <div className={rowClass}>
                <span className="text-sm text-slate-500">사용액</span>
                {isLoading ? (
                  <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
                ) : (
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatCurrencyShort(stats?.totalUsed || 0)}
                  </span>
                )}
              </div>
              <div className={rowClass}>
                <span className="text-sm text-slate-500">잔여</span>
                {isLoading ? (
                  <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
                ) : (
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      (stats?.totalBalance || 0) >= 0
                        ? "text-slate-900"
                        : "text-rose-600"
                    )}
                  >
                    {formatCurrencyShort(stats?.totalBalance || 0)}
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* 복지포인트 */}
          <Link href="/points-overview" className={cardClass}>
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-800">복지포인트</h3>
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
                {welfareUsageRate.toFixed(0)}%
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
                      : "text-slate-900"
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
                <h3 className="text-base font-semibold text-slate-800">활동비</h3>
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
                {activityUsageRate.toFixed(0)}%
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
                      : "text-slate-900"
                  )}
                >
                  {formatCurrencyShort(pointsSummary.activity.remaining)}
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(isYearOpen || isMonthOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsYearOpen(false);
            setIsMonthOpen(false);
          }}
        />
      )}
    </div>
  );
}
