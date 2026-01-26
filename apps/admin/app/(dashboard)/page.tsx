"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import dayjs from "dayjs";
import {
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Sparkles,
  AlertCircle,
  Store,
  BarChart3,
  Calendar,
  Upload,
  Download,
  UserCheck,
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

interface AlertsData {
  totalMembers: number;
  missingMembersCount: number;
  missingMembers: { id: string; full_name: string }[];
  todayMissing: number;
  month: string;
}

interface StoreData {
  name: string;
  count: number;
  totalAmount: number;
}

interface MemberSpendingData {
  members: {
    id: string;
    name: string;
    totalUsed: number;
    totalAllowance: number;
    usageRate: number;
  }[];
  average: number;
  totalMembers: number;
}

interface TrendData {
  month: string;
  year: number;
  fullMonth: string;
  lunch: number;
  dinner: number;
  breakfast: number;
  total: number;
}

export default function DashboardPage() {
  const { checkSession } = useAuth();
  const currentDate = dayjs();
  const [selectedYear, setSelectedYear] = useState(currentDate.year());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month() + 1);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  // 기존 통계
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

  // 알림 데이터
  const { data: alerts } = useQuery<AlertsData>({
    queryKey: queryKeys.dashboard.alerts(selectedYear, selectedMonth),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/alerts?year=${selectedYear}&month=${selectedMonth}`
      );
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return response.json();
    },
  });

  // 인기 가게
  const { data: popularStores } = useQuery<{ stores: StoreData[] }>({
    queryKey: queryKeys.dashboard.popularStores(selectedYear, selectedMonth),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/popular-stores?year=${selectedYear}&month=${selectedMonth}`
      );
      if (!response.ok) throw new Error("Failed to fetch popular stores");
      return response.json();
    },
  });

  // 멤버별 지출
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

  // 월별 추이
  const { data: trends } = useQuery<{ trends: TrendData[] }>({
    queryKey: queryKeys.dashboard.trends(selectedYear, selectedMonth),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/trends?year=${selectedYear}&month=${selectedMonth}`
      );
      if (!response.ok) throw new Error("Failed to fetch trends");
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
      return `${(amount / 10000).toFixed(0)}만`;
    }
    return formatCurrency(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const usageRate = stats?.totalAllowance
    ? ((stats.totalUsed || 0) / stats.totalAllowance) * 100
    : 0;

  const statCards = [
    {
      title: "총 인원",
      value: stats?.totalMembers || 0,
      suffix: "명",
      icon: Users,
      color: "slate",
      bgGradient: "from-slate-500 to-slate-600",
      change: null,
    },
    {
      title: "총 지원금",
      value: stats?.totalAllowance || 0,
      suffix: "원",
      icon: Wallet,
      color: "sky",
      bgGradient: "from-sky-500 to-sky-600",
      change: null,
      isCurrency: true,
    },
    {
      title: "사용 금액",
      value: stats?.totalUsed || 0,
      suffix: "원",
      icon: TrendingUp,
      color: "amber",
      bgGradient: "from-amber-500 to-amber-600",
      change: usageRate > 0 ? `${usageRate.toFixed(1)}% 사용` : null,
      changeType: "neutral" as const,
      isCurrency: true,
    },
    {
      title: "잔여 금액",
      value: stats?.totalBalance || 0,
      suffix: "원",
      icon: (stats?.totalBalance || 0) >= 0 ? TrendingUp : TrendingDown,
      color: (stats?.totalBalance || 0) >= 0 ? "emerald" : "rose",
      bgGradient:
        (stats?.totalBalance || 0) >= 0
          ? "from-emerald-500 to-emerald-600"
          : "from-rose-500 to-rose-600",
      change:
        (stats?.totalBalance || 0) >= 0
          ? `${(100 - usageRate).toFixed(1)}% 남음`
          : "초과 사용",
      changeType: (stats?.totalBalance || 0) >= 0 ? ("positive" as const) : ("negative" as const),
      isCurrency: true,
    },
  ];

  // 월별 추이 차트의 최대값 계산
  const maxTrendValue = Math.max(...(trends?.trends.map((t) => t.total) || [1]));

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Year Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsYearOpen(!isYearOpen);
              setIsMonthOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50 hover:shadow-md"
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
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                    year === selectedYear
                      ? "bg-amber-50 font-medium text-amber-600"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {year}년
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Month Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsMonthOpen(!isMonthOpen);
              setIsYearOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50 hover:shadow-md"
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
                  }}
                  className={cn(
                    "flex items-center justify-center rounded-lg py-2 text-sm transition-colors",
                    month === selectedMonth
                      ? "bg-amber-50 font-medium text-amber-600"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {month}월
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current period indicator */}
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>
            {selectedYear}년 {selectedMonth}월 현황
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <div
            key={card.title}
            className="stat-card group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <div className="space-y-1">
                  {isLoading ? (
                    <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
                  ) : (
                    <p className="text-3xl font-bold tracking-tight text-slate-900">
                      {card.isCurrency
                        ? formatCurrencyShort(card.value)
                        : card.value}
                      <span className="ml-1 text-lg font-medium text-slate-400">
                        {card.suffix === "원" && card.isCurrency ? "" : card.suffix}
                      </span>
                    </p>
                  )}
                  {card.change && !isLoading && (
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        card.changeType === "positive" && "text-emerald-600",
                        card.changeType === "negative" && "text-rose-600",
                        card.changeType === "neutral" && "text-slate-500"
                      )}
                    >
                      {card.changeType === "positive" && (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                      {card.changeType === "negative" && (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      {card.change}
                    </div>
                  )}
                </div>
              </div>
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110",
                  card.bgGradient
                )}
              >
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3열 그리드: 알림, 인기 가게, 멤버별 지출 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 3. 미입력/미처리 알림 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-900">미입력 알림</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
              <span className="text-sm text-amber-700">이번 달 미입력</span>
              <span className="text-lg font-bold text-amber-600">
                {alerts?.missingMembersCount || 0}명
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <span className="text-sm text-slate-600">오늘 미입력</span>
              <span className="text-lg font-bold text-slate-700">
                {alerts?.todayMissing || 0}명
              </span>
            </div>
            {alerts?.missingMembers && alerts.missingMembers.length > 0 && (
              <div className="pt-2">
                <p className="mb-2 text-xs font-medium text-slate-400">미입력 멤버</p>
                <div className="flex flex-wrap gap-1">
                  {alerts.missingMembers.map((m) => (
                    <span
                      key={m.id}
                      className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                    >
                      {m.full_name}
                    </span>
                  ))}
                  {alerts.missingMembersCount > 5 && (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-400">
                      +{alerts.missingMembersCount - 5}명
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. 인기 가게 TOP 5 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-slate-900">인기 가게 TOP 5</h3>
          </div>
          <div className="space-y-3">
            {popularStores?.stores && popularStores.stores.length > 0 ? (
              popularStores.stores.map((store, idx) => (
                <div key={store.name} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                      idx === 0
                        ? "bg-amber-100 text-amber-600"
                        : idx === 1
                        ? "bg-slate-200 text-slate-600"
                        : idx === 2
                        ? "bg-orange-100 text-orange-600"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {store.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {store.count}회 · {formatCurrency(store.totalAmount)}원
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">
                데이터가 없습니다
              </p>
            )}
          </div>
        </div>

        {/* 5. 멤버별 지출 현황 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
          <div className="mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-sky-500" />
            <h3 className="font-bold text-slate-900">멤버별 지출 TOP 5</h3>
          </div>
          <div className="space-y-3">
            {memberSpending?.members && memberSpending.members.length > 0 ? (
              memberSpending.members.map((member) => (
                <div key={member.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {member.name}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatCurrency(member.totalUsed)}원
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        member.usageRate > 100
                          ? "bg-rose-400"
                          : member.usageRate > 80
                          ? "bg-amber-400"
                          : "bg-sky-400"
                      )}
                      style={{ width: `${Math.min(member.usageRate, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">
                데이터가 없습니다
              </p>
            )}
            {memberSpending?.average !== undefined && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">전체 평균</span>
                  <span className="font-bold text-slate-700">
                    {formatCurrency(memberSpending.average)}원
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. 월별 추이 차트 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div className="mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-500" />
          <h3 className="font-bold text-slate-900">월별 지출 추이 (최근 6개월)</h3>
        </div>
        <div className="space-y-4">
          {/* 범례 */}
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-amber-400" />
              <span className="text-slate-500">중식</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-violet-400" />
              <span className="text-slate-500">석식</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-emerald-400" />
              <span className="text-slate-500">조식</span>
            </div>
          </div>
          {/* 차트 */}
          <div className="flex items-end gap-4">
            {trends?.trends && trends.trends.length > 0 ? (
              trends.trends.map((trend) => (
                <div key={trend.fullMonth} className="flex-1 space-y-2">
                  <div
                    className="flex flex-col justify-end rounded-t-lg overflow-hidden"
                    style={{ height: "160px" }}
                  >
                    {/* 조식 */}
                    <div
                      className="w-full bg-emerald-400 transition-all"
                      style={{
                        height: `${(trend.breakfast / maxTrendValue) * 160}px`,
                      }}
                    />
                    {/* 석식 */}
                    <div
                      className="w-full bg-violet-400 transition-all"
                      style={{
                        height: `${(trend.dinner / maxTrendValue) * 160}px`,
                      }}
                    />
                    {/* 중식 */}
                    <div
                      className="w-full bg-amber-400 transition-all"
                      style={{
                        height: `${(trend.lunch / maxTrendValue) * 160}px`,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-600">{trend.month}</p>
                    <p className="text-[10px] text-slate-400">
                      {formatCurrencyShort(trend.total)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="flex-1 py-8 text-center text-sm text-slate-400">
                데이터가 없습니다
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 7. 빠른 작업 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-slate-900">빠른 작업</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/calendar"
            className="flex flex-col items-center gap-2 rounded-xl bg-amber-50 p-4 transition-all hover:bg-amber-100 hover:shadow-sm"
          >
            <Calendar className="h-6 w-6 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">식대 입력</span>
          </Link>
          <Link
            href="/import"
            className="flex flex-col items-center gap-2 rounded-xl bg-sky-50 p-4 transition-all hover:bg-sky-100 hover:shadow-sm"
          >
            <Upload className="h-6 w-6 text-sky-600" />
            <span className="text-sm font-medium text-sky-700">엑셀 Import</span>
          </Link>
          <Link
            href="/export"
            className="flex flex-col items-center gap-2 rounded-xl bg-emerald-50 p-4 transition-all hover:bg-emerald-100 hover:shadow-sm"
          >
            <Download className="h-6 w-6 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">엑셀 Export</span>
          </Link>
          <Link
            href="/users"
            className="flex flex-col items-center gap-2 rounded-xl bg-violet-50 p-4 transition-all hover:bg-violet-100 hover:shadow-sm"
          >
            <Users className="h-6 w-6 text-violet-600" />
            <span className="text-sm font-medium text-violet-700">사용자 현황</span>
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
