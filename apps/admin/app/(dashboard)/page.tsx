"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
      changeType: ((stats?.totalBalance || 0) >= 0 ? "positive" : "negative") as const,
      isCurrency: true,
    },
  ];

  return (
    <div className="space-y-8">
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

      {/* Summary Card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">월별 현황 요약</h3>
            <p className="text-sm text-slate-500">
              {selectedYear}년 {selectedMonth}월 식대 사용 현황
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-4 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-4 w-3/4 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-4 w-1/2 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Usage Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">지원금 사용률</span>
                <span className="font-bold text-slate-900">{usageRate.toFixed(1)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    usageRate > 100
                      ? "bg-gradient-to-r from-rose-400 to-rose-500"
                      : usageRate > 80
                      ? "bg-gradient-to-r from-amber-400 to-amber-500"
                      : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  )}
                  style={{ width: `${Math.min(usageRate, 100)}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  평균 사용 금액
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(stats?.averageUsage || 0)}
                  <span className="ml-1 text-sm font-medium text-slate-400">원</span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  인당 지원금
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(
                    stats?.totalMembers
                      ? Math.round((stats.totalAllowance || 0) / stats.totalMembers)
                      : 0
                  )}
                  <span className="ml-1 text-sm font-medium text-slate-400">원</span>
                </p>
              </div>
            </div>
          </div>
        )}
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
