"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import dayjs from "dayjs";
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Calendar,
  Upload,
  Download,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
    excess: number;
    usageRate: number;
  }[];
  average: number;
  totalMembers: number;
}

interface TrendData {
  month: string;
  year: number;
  fullMonth: string;
  averageExcess: number;
  totalExcess: number;
  memberCount: number;
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

  // trends는 항상 현재 월 기준 6개월 (선택한 월과 무관)
  const { data: trends } = useQuery<{ trends: TrendData[] }>({
    queryKey: queryKeys.dashboard.trends(currentDate.year(), currentDate.month() + 1),
    queryFn: async () => {
      const response = await fetch(`/api/stats/trends`);
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
      return `${(amount / 10000).toFixed(1)}만`;
    }
    return formatCurrency(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const usageRate = stats?.totalAllowance
    ? ((stats.totalUsed || 0) / stats.totalAllowance) * 100
    : 0;

  // Y축 범위 계산 (최대 초과금 기준)
  const maxExcess = Math.max(
    ...((trends?.trends.map((t) => Math.max(0, t.averageExcess)) || [10000]))
  );
  const settlementRate = settlement?.totalMembers
    ? (settlement.settledCount / settlement.totalMembers) * 100
    : 0;

  return (
    <div className="space-y-6">
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* 총 인원 */}
        <div className="glass-panel rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
          <p className="text-sm font-medium text-slate-500">총 인원</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {stats?.totalMembers || 0}
              <span className="ml-1 text-base font-medium text-slate-400">명</span>
            </p>
          )}
        </div>

        {/* 총 지원금 */}
        <div className="glass-panel rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">총 지원금</p>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              예산
            </span>
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrencyShort(stats?.totalAllowance || 0)}
            </p>
          )}
        </div>

        {/* 사용 금액 */}
        <div className="glass-panel rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">사용 금액</p>
            <span className="rounded-full bg-[#a855f7]/10 px-2 py-0.5 text-[10px] font-semibold text-[#a855f7]">
              {usageRate.toFixed(1)}%
            </span>
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrencyShort(stats?.totalUsed || 0)}
            </p>
          )}
        </div>

        {/* 잔여 금액 */}
        <div className="glass-panel rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">잔여 금액</p>
            {(stats?.totalBalance || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-slate-100" />
          ) : (
            <p
              className={cn(
                "mt-2 text-2xl font-bold",
                (stats?.totalBalance || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {formatCurrencyShort(stats?.totalBalance || 0)}
            </p>
          )}
        </div>
      </div>

      {/* 3열 그리드 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* 정산 현황 */}
        <div className="glass-panel rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">정산 현황</h3>
            <span className="rounded-full bg-[#135bec]/10 px-2.5 py-0.5 text-xs font-medium text-[#135bec]">
              {settlement?.settledCount || 0}/{settlement?.totalMembers || 0}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-[#135bec]/5 p-3.5">
              <span className="text-sm font-medium text-[#135bec]">정산 완료</span>
              <span className="text-lg font-bold text-[#135bec]">
                {settlement?.settledCount || 0}명
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-orange-50 p-3.5">
              <span className="text-sm font-medium text-orange-600">미정산</span>
              <span className="text-lg font-bold text-orange-600">
                {settlement?.unsettledCount || 0}명
              </span>
            </div>
          </div>

          {settlement?.unsettledMembers && settlement.unsettledMembers.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-400">미정산 멤버</p>
              <div className="flex flex-wrap gap-1.5">
                {settlement.unsettledMembers.slice(0, 5).map((m) => (
                  <span
                    key={m.id}
                    className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600"
                  >
                    {m.full_name}
                  </span>
                ))}
                {settlement.unsettledCount > 5 && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                    +{settlement.unsettledCount - 5}명
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 인기 가게 TOP 5 */}
        <div className="glass-panel rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
          <h3 className="mb-4 font-semibold text-slate-900">인기 가게</h3>
          <div className="space-y-1">
            {popularStores?.stores && popularStores.stores.length > 0 ? (
              popularStores.stores.map((store, idx) => (
                <div
                  key={store.name}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-all hover:bg-[#135bec]/5"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold transition-transform group-hover:scale-110",
                      idx === 0
                        ? "bg-yellow-400 text-white"
                        : idx === 1
                        ? "bg-slate-300 text-white"
                        : idx === 2
                        ? "bg-amber-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {idx + 1}
                  </span>
                  <p className="flex-1 min-w-0 truncate text-sm font-medium text-slate-700 group-hover:text-[#135bec]">
                    {store.name}
                  </p>
                  <span className="text-xs text-slate-400 group-hover:text-[#135bec]">
                    {store.count}회
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                데이터가 없습니다
              </p>
            )}
          </div>
        </div>

        {/* 초과액 TOP 5 */}
        <div className="glass-panel rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
          <h3 className="mb-4 font-semibold text-slate-900">초과액 현황</h3>
          <div className="space-y-1">
            {memberSpending?.members && memberSpending.members.length > 0 ? (
              memberSpending.members.map((member, idx) => (
                <div
                  key={member.id}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-all hover:bg-rose-50"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold transition-transform group-hover:scale-110",
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
                  <p className="flex-1 min-w-0 text-sm font-medium text-slate-700 group-hover:text-rose-600">
                    {member.name}
                  </p>
                  <span className="text-xs font-medium text-rose-500">
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
      </div>

      {/* 월별 추이 + 빠른 작업 (6:4) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-10">
        {/* 월별 평균 초과금 추이 차트 (6) */}
        <div className="glass-panel rounded-2xl p-5 transition-all duration-300 hover:shadow-lg lg:col-span-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">월별 평균 초과금 추이</h3>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-slate-500">초과</span>
            </div>
          </div>
          <div className="h-[180px]">
            {trends?.trends && trends.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trends.trends.map((t) => ({
                    ...t,
                    // 음수는 0으로 처리 (초과 금액만 표시)
                    excess: Math.max(0, t.averageExcess),
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="excessGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    dy={5}
                  />
                  <YAxis
                    domain={[0, maxExcess || 10000]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(value) => {
                      if (value === 0) return "0";
                      if (value >= 10000) {
                        return `+${(value / 10000).toFixed(0)}만`;
                      }
                      return `+${(value / 1000).toFixed(0)}천`;
                    }}
                    width={45}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `+${formatCurrency(value)}원`,
                      "평균 초과금",
                    ]}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="excess"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="url(#excessGradient)"
                    dot={(props) => {
                      const { cx, cy, index } = props;
                      return (
                        <circle
                          key={`dot-${index}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="#f43f5e"
                          stroke="white"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{
                      r: 6,
                      stroke: "white",
                      strokeWidth: 2,
                      fill: "#f43f5e",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">
                데이터가 없습니다
              </p>
            )}
          </div>
        </div>

        {/* 빠른 작업 (4) */}
        <div className="glass-panel rounded-2xl p-5 transition-all duration-300 hover:shadow-lg lg:col-span-4">
          <h3 className="mb-4 font-semibold text-slate-900">빠른 작업</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/calendar"
              className="flex flex-col items-center gap-2.5 rounded-xl bg-white/50 p-4 ring-1 ring-slate-100 transition-all hover:bg-white hover:shadow-md hover:ring-[#135bec]/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#135bec]/10">
                <Calendar className="h-5 w-5 text-[#135bec]" />
              </div>
              <span className="text-xs font-medium text-slate-600">식대 입력</span>
            </Link>
            <Link
              href="/import"
              className="flex flex-col items-center gap-2.5 rounded-xl bg-white/50 p-4 ring-1 ring-slate-100 transition-all hover:bg-white hover:shadow-md hover:ring-orange-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
                <Upload className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-xs font-medium text-slate-600">Import</span>
            </Link>
            <Link
              href="/export"
              className="flex flex-col items-center gap-2.5 rounded-xl bg-white/50 p-4 ring-1 ring-slate-100 transition-all hover:bg-white hover:shadow-md hover:ring-emerald-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <Download className="h-5 w-5 text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-slate-600">Export</span>
            </Link>
            <Link
              href="/users"
              className="flex flex-col items-center gap-2.5 rounded-xl bg-white/50 p-4 ring-1 ring-slate-100 transition-all hover:bg-white hover:shadow-md hover:ring-[#a855f7]/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a855f7]/10">
                <Users className="h-5 w-5 text-[#a855f7]" />
              </div>
              <span className="text-xs font-medium text-slate-600">사용자</span>
            </Link>
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
