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
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Users,
  Wallet,
  CreditCard,
  PiggyBank,
  AlertTriangle,
  ArrowRight,
  Coins,
  Activity,
  Heart,
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

// ── Progress Ring ──

function ProgressRing({
  percent,
  size = 48,
  stroke = 4,
  color = "#135bec",
  trackColor = "rgba(0,0,0,0.06)",
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
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
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50"
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
            <div className="absolute left-0 top-full z-50 mt-2 w-32 rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200/60">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year);
                    setIsYearOpen(false);
                    updateURL(year, selectedMonth);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                    year === selectedYear
                      ? "bg-[#135bec]/10 font-medium text-[#135bec]"
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
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50"
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
            <div className="absolute left-0 top-full z-50 mt-2 grid w-48 grid-cols-4 gap-1 rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200/60">
              {months.map((month) => (
                <button
                  key={month}
                  onClick={() => {
                    setSelectedMonth(month);
                    setIsMonthOpen(false);
                    updateURL(selectedYear, month);
                  }}
                  className={cn(
                    "flex items-center justify-center rounded-lg py-2 text-sm transition-colors",
                    month === selectedMonth
                      ? "bg-[#135bec]/10 font-medium text-[#135bec]"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {month}월
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto text-sm text-slate-500">
          {selectedYear}년 {selectedMonth}월 현황
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          상위 계층 — 총 인원 / 점심조 / 특이사항
          ══════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* 총 인원 */}
        <div className="glass-panel flex flex-col rounded-2xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">총 인원</h3>
            <Link
              href="/meal-status"
              className="text-[11px] text-[#135bec] hover:underline"
            >
              관리
            </Link>
          </div>
          <div className="mb-3 flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-9 w-16 animate-pulse rounded bg-slate-100" />
            ) : (
              <>
                <span className="text-3xl font-bold tabular-nums text-slate-900">
                  {stats?.totalMembers || 0}
                </span>
                <span className="text-sm text-slate-400">명</span>
              </>
            )}
          </div>
          <div className="flex-1 space-y-1.5 border-t border-slate-100 pt-2.5">
            <div className="flex items-center justify-between rounded-lg bg-slate-50/80 px-3 py-1.5">
              <span className="text-xs text-slate-500">정상 근무</span>
              <span className="text-xs font-semibold tabular-nums text-slate-700">
                {(stats?.totalMembers || 0) - statusMemberCount}명
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50/80 px-3 py-1.5">
              <span className="text-xs text-amber-600">특이사항</span>
              <span className="text-xs font-semibold tabular-nums text-amber-600">
                {statusMemberCount}명
              </span>
            </div>
          </div>
        </div>

        {/* 특이사항 인원 */}
        <div className="glass-panel flex flex-col rounded-2xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">특이사항 인원</h3>
            <Link
              href="/member-status"
              className="text-[11px] text-[#135bec] hover:underline"
            >
              관리
            </Link>
          </div>
          {statusMembers && statusMembers.length > 0 ? (
            <>
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
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      STATUS_COLORS[status] ||
                        "bg-slate-50 text-slate-600 border-slate-200"
                    )}
                  >
                    {status} {count}
                  </span>
                ))}
              </div>
              <div className="flex-1 space-y-0.5 overflow-y-auto border-t border-slate-100 pt-2">
                {statusMembers.map((m) => (
                  <div
                    key={m.member_id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-50"
                  >
                    <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                      {m.full_name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
                        STATUS_COLORS[m.current_status || ""] ||
                          "bg-slate-50 text-slate-600 border-slate-200"
                      )}
                    >
                      {m.current_status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-xs text-slate-400">
              특이사항 인원이 없습니다
            </p>
          )}
        </div>

        {/* 점심조 현황 */}
        <div className="glass-panel flex flex-col rounded-2xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">점심조</h3>
            <Link
              href="/lunch-groups"
              className="text-[11px] text-[#135bec] hover:underline"
            >
              관리
            </Link>
          </div>
          <div className="mb-1.5 flex items-center justify-between">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="rounded-lg p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium tabular-nums text-slate-600">
                {weekStartDisplay} ~ {weekEndDate}
              </span>
              {weekOffset === 0 && (
                <span className="rounded-full bg-[#135bec]/10 px-1.5 py-0.5 text-[9px] font-medium text-[#135bec]">
                  이번주
                </span>
              )}
            </div>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="rounded-lg p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {lunchGroups && lunchGroups.length > 0 ? (
              lunchGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center gap-2.5 rounded-lg bg-slate-50/80 px-3 py-1.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#135bec]/10 text-[10px] font-bold text-[#135bec]">
                    {group.group_number}
                  </span>
                  <div className="min-w-0 flex-1 truncate text-xs text-slate-600">
                    {group.members.map((m) => m.member.full_name).join(", ") ||
                      "미배정"}
                  </div>
                  <span className="text-[11px] font-medium tabular-nums text-slate-400">
                    {group.members.length}/{group.max_slots}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-slate-400">
                {weekOffset === 0 ? "이번 주" : "해당 주"} 점심조가 없습니다
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          식대 (left) + 포인트 (right)
          ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* ── 식대 현황 ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">식대 현황</h3>
            <Link
              href="/meal-status"
              className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-[#135bec]"
            >
              상세보기
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* 지원금 / 사용 / 잔여 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel flex flex-col rounded-2xl p-4 transition-all duration-200 hover:shadow-md">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/8">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              {isLoading ? (
                <div className="h-6 w-14 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className="text-lg font-bold tabular-nums text-slate-900">
                  {formatCurrencyShort(stats?.totalAllowance || 0)}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-slate-500">총 지원금</p>
            </div>

            <div className="glass-panel flex flex-col rounded-2xl p-4 transition-all duration-200 hover:shadow-md">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/8">
                <CreditCard className="h-4 w-4 text-amber-600" />
              </div>
              {isLoading ? (
                <div className="h-6 w-14 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className="text-lg font-bold tabular-nums text-slate-900">
                  {formatCurrencyShort(stats?.totalUsed || 0)}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-slate-500">
                사용
                <span className="ml-0.5 text-[10px] text-slate-400">
                  ({usageRate.toFixed(0)}%)
                </span>
              </p>
            </div>

            <div className="glass-panel flex flex-col rounded-2xl p-4 transition-all duration-200 hover:shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/8">
                  <PiggyBank className="h-4 w-4 text-violet-600" />
                </div>
                {(stats?.totalBalance || 0) >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                )}
              </div>
              {isLoading ? (
                <div className="h-6 w-14 animate-pulse rounded bg-slate-100" />
              ) : (
                <p
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    (stats?.totalBalance || 0) >= 0
                      ? "text-slate-900"
                      : "text-rose-600"
                  )}
                >
                  {formatCurrencyShort(stats?.totalBalance || 0)}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-slate-500">잔여</p>
            </div>
          </div>

          {/* 정산현황 + 초과액 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 정산 현황 */}
            <div className="glass-panel flex flex-col rounded-2xl p-4 transition-all duration-200 hover:shadow-md">
              <h4 className="mb-2 text-xs font-semibold text-slate-700">
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
                        <span className="text-xl font-bold tabular-nums text-[#135bec]">
                          {settlement?.settledCount || 0}
                        </span>
                        <span className="text-[10px] text-slate-400">완료</span>
                      </div>
                      <span className="text-slate-300">/</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold tabular-nums text-orange-500">
                          {filteredUnsettledCount}
                        </span>
                        <span className="text-[10px] text-slate-400">미정산</span>
                      </div>
                    </div>
                    {excludedCount > 0 && (
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        특이사항 {excludedCount}명 제외
                      </p>
                    )}
                    {filteredUnsettled.length > 0 && (
                      <div className="mt-2 flex-1 overflow-y-auto border-t border-slate-100 pt-2">
                        <div className="flex flex-wrap gap-1">
                          {[...filteredUnsettled]
                            .sort((a, b) =>
                              a.full_name.localeCompare(b.full_name, "ko")
                            )
                            .map((m) => (
                              <span
                                key={m.id}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
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
            </div>

            {/* 초과액 현황 */}
            <div className="glass-panel flex flex-col rounded-2xl p-4 transition-all duration-200 hover:shadow-md">
              <h4 className="mb-2 text-xs font-semibold text-slate-700">
                초과액 현황
              </h4>
              <div className="flex-1 space-y-0.5 overflow-y-auto">
                {memberSpending?.members &&
                memberSpending.members.length > 0 ? (
                  memberSpending.members.map((member, idx) => (
                    <div
                      key={member.id}
                      className="group flex items-center gap-2 rounded-lg px-1.5 py-1 transition-all hover:bg-rose-50/80"
                    >
                      <span
                        className={cn(
                          "flex h-4.5 w-4.5 items-center justify-center rounded text-[9px] font-bold",
                          idx === 0
                            ? "bg-rose-500 text-white"
                            : idx === 1
                              ? "bg-orange-400 text-white"
                              : idx === 2
                                ? "bg-amber-400 text-white"
                                : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 group-hover:text-rose-600">
                        {member.name}
                      </p>
                      <span className="text-[11px] font-semibold tabular-nums text-rose-500">
                        +{formatCurrency(member.excess)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-slate-400">
                    초과액이 없습니다
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── 포인트 현황 ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                포인트 현황
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {budgetPeriod}
              </span>
            </div>
            <Link
              href="/points-overview"
              className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-[#135bec]"
            >
              상세보기
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* 복지포인트 */}
            <div className="glass-panel rounded-2xl p-5 transition-all duration-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Heart className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      복지포인트
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {pointsSummary.welfare.memberCount}명 할당
                    </p>
                  </div>
                </div>
                <div className="relative flex items-center justify-center">
                  <ProgressRing
                    percent={welfareUsageRate}
                    size={44}
                    stroke={4}
                    color="#10b981"
                  />
                  <span className="absolute text-[10px] font-bold text-emerald-600">
                    {welfareUsageRate.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-medium text-slate-400">할당액</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-800">
                    {formatCurrencyShort(pointsSummary.welfare.total)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400">사용액</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-800">
                    {formatCurrencyShort(pointsSummary.welfare.used)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400">잔여액</p>
                  <p
                    className={cn(
                      "mt-0.5 text-sm font-bold tabular-nums",
                      pointsSummary.welfare.remaining < 0
                        ? "text-rose-600"
                        : "text-emerald-600"
                    )}
                  >
                    {formatCurrencyShort(pointsSummary.welfare.remaining)}
                  </p>
                </div>
              </div>
            </div>

            {/* 활동비 */}
            <div className="glass-panel rounded-2xl p-5 transition-all duration-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <Activity className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">활동비</p>
                    <p className="text-[11px] text-slate-400">
                      {pointsSummary.activity.memberCount}명 할당
                    </p>
                  </div>
                </div>
                <div className="relative flex items-center justify-center">
                  <ProgressRing
                    percent={activityUsageRate}
                    size={44}
                    stroke={4}
                    color="#3b82f6"
                  />
                  <span className="absolute text-[10px] font-bold text-blue-600">
                    {activityUsageRate.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-medium text-slate-400">할당액</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-800">
                    {formatCurrencyShort(pointsSummary.activity.total)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400">사용액</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-800">
                    {formatCurrencyShort(pointsSummary.activity.used)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400">잔여액</p>
                  <p
                    className={cn(
                      "mt-0.5 text-sm font-bold tabular-nums",
                      pointsSummary.activity.remaining < 0
                        ? "text-rose-600"
                        : "text-blue-600"
                    )}
                  >
                    {formatCurrencyShort(pointsSummary.activity.remaining)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
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
