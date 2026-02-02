"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
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


const getWeekStartDate = (date: dayjs.Dayjs) => {
  const day = date.day();
  const diff = day === 0 ? -6 : 1 - day;
  return date.add(diff, "day").format("YYYY-MM-DD");
};

export default function DashboardPage() {
  const { checkSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDate = dayjs();

  // URL 파라미터에서 초기값 가져오기
  const initialYear = searchParams.get("year");
  const initialMonth = searchParams.get("month");

  const [selectedYear, setSelectedYear] = useState(() => {
    return initialYear ? parseInt(initialYear) : currentDate.year();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return initialMonth ? parseInt(initialMonth) : currentDate.month() + 1;
  });
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // URL 업데이트 함수
  const updateURL = useCallback(
    (year: number, month: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", year.toString());
      params.set("month", month.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // URL 파라미터가 변경되면 상태 업데이트
  useEffect(() => {
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    if (year) setSelectedYear(parseInt(year));
    if (month) setSelectedMonth(parseInt(month));
  }, [searchParams]);

  useEffect(() => {
    checkSession();
  }, []);

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

  console.log("🔍 ~ DashboardPage ~ apps/admin/app/(dashboard)/page.tsx:299 ~ totalUsed:", stats);

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
      const response = await fetch(`/api/lunch-groups?weekStartDate=${weekStartDate}`);
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

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const usageRate = stats?.totalAllowance
    ? ((stats.totalUsed || 0) / stats.totalAllowance) * 100
    : 0;

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4">
      {/* Date Selector */}
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

      {/* Stat Cards */}
      <div className="grid min-h-0 flex-[2.5] grid-cols-2 gap-4 xl:grid-cols-4">
        {/* 총 인원 */}
        <Link
          href="/users"
          className="group glass-panel flex flex-col justify-between rounded-2xl p-5 transition-all duration-200 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135bec]/10">
              <Users className="h-4 w-4 text-[#135bec]" />
            </div>
            <ExternalLink className="h-4 w-4 text-slate-300 transition-colors group-hover:text-[#135bec]" />
          </div>
          <div className="mt-auto">
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
            ) : (
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {stats?.totalMembers || 0}
                <span className="ml-1 text-sm font-medium text-slate-400">명</span>
              </p>
            )}
            <p className="mt-0.5 text-xs font-medium text-slate-500">총 인원</p>
          </div>
        </Link>

        {/* 총 지원금 */}
        <div className="glass-panel flex flex-col justify-between rounded-2xl p-5 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135bec]/10">
              <Wallet className="h-4 w-4 text-[#135bec]" />
            </div>
            <span className="rounded-full bg-[#135bec]/10 px-2 py-0.5 text-[10px] font-medium text-[#135bec]">
              예산
            </span>
          </div>
          <div className="mt-auto">
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
            ) : (
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrencyShort(stats?.totalAllowance || 0)}
              </p>
            )}
            <p className="mt-0.5 text-xs font-medium text-slate-500">총 지원금</p>
          </div>
        </div>

        {/* 사용 금액 */}
        <div className="glass-panel flex flex-col justify-between rounded-2xl p-5 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135bec]/10">
              <CreditCard className="h-4 w-4 text-[#135bec]" />
            </div>
            <span className="rounded-full bg-[#135bec]/10 px-2 py-0.5 text-[10px] font-medium text-[#135bec]">
              {usageRate.toFixed(1)}%
            </span>
          </div>
          <div className="mt-auto">
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
            ) : (
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrencyShort(stats?.totalUsed || 0)}
              </p>
            )}
            <p className="mt-0.5 text-xs font-medium text-slate-500">사용 금액</p>
          </div>
        </div>

        {/* 잔여 금액 */}
        <div className="glass-panel flex flex-col justify-between rounded-2xl p-5 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135bec]/10">
              <PiggyBank className="h-4 w-4 text-[#135bec]" />
            </div>
            {(stats?.totalBalance || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
          </div>
          <div className="mt-auto">
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
            ) : (
              <p
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  (stats?.totalBalance || 0) >= 0 ? "text-slate-900" : "text-rose-600"
                )}
              >
                {formatCurrencyShort(stats?.totalBalance || 0)}
              </p>
            )}
            <p className="mt-0.5 text-xs font-medium text-slate-500">잔여 금액</p>
          </div>
        </div>
      </div>

      {/* 3열 그리드 */}
      <div className="grid min-h-0 flex-[7.5] grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 정산 현황 */}
        <div className="glass-panel flex flex-col rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
          <h3 className="mb-3 font-semibold text-slate-900">정산 현황</h3>
          <div className="flex items-baseline gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#135bec]">
                {settlement?.settledCount || 0}
              </span>
              <span className="text-xs text-slate-400">완료</span>
            </div>
            <span className="text-slate-300">/</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-orange-500">
                {settlement?.unsettledCount || 0}
              </span>
              <span className="text-xs text-slate-400">미정산</span>
            </div>
          </div>
          {settlement?.unsettledMembers && settlement.unsettledMembers.length > 0 && (
            <div className="mt-3 flex-1 overflow-y-auto border-t border-slate-100 pt-3">
              <p className="mb-2 text-[10px] font-medium text-slate-400">미정산</p>
              <div className="flex flex-wrap gap-1.5">
                {[...settlement.unsettledMembers]
                  .sort((a, b) => a.full_name.localeCompare(b.full_name, "ko"))
                  .map((m) => (
                    <span
                      key={m.id}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {m.full_name}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* 초과액 TOP 5 */}
        <div className="glass-panel flex flex-col rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
          <h3 className="mb-3 font-semibold text-slate-900">초과액 현황</h3>
          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {memberSpending?.members && memberSpending.members.length > 0 ? (
              memberSpending.members.map((member, idx) => (
                <div
                  key={member.id}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-all hover:bg-rose-50"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold transition-transform group-hover:scale-110",
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
                  <p className="flex-1 min-w-0 truncate text-sm font-medium text-slate-700 group-hover:text-rose-600">
                    {member.name}
                  </p>
                  <span className="text-sm font-semibold text-rose-500">
                    +{formatCurrency(member.excess)}원
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                초과액이 없습니다
              </p>
            )}
          </div>
        </div>

        {/* 점심조 현황 */}
        <div className="glass-panel flex flex-col rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">점심조 현황</h3>
            <Link
              href="/lunch-groups"
              className="text-xs text-[#135bec] hover:underline"
            >
              관리하기
            </Link>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">
                {weekStartDisplay} ~ {weekEndDate}
              </span>
              {weekOffset === 0 && (
                <span className="rounded-full bg-[#135bec]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#135bec]">
                  이번주
                </span>
              )}
            </div>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {lunchGroups && lunchGroups.length > 0 ? (
              lunchGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#135bec]/10 text-xs font-bold text-[#135bec]">
                    {group.group_number}
                  </span>
                  <div className="flex-1 min-w-0 truncate text-sm text-slate-600">
                    {group.members.map((m) => m.member.full_name).join(", ") || "미배정"}
                  </div>
                  <span className="text-sm font-medium text-slate-500">
                    {group.members.length}/{group.max_slots}명
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                {weekOffset === 0 ? "이번 주" : "해당 주"} 점심조가 없습니다
              </p>
            )}
          </div>
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
