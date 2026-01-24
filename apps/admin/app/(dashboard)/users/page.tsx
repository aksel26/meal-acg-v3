"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Search,
  ChevronDown,
  FileSpreadsheet,
  Check,
  X,
  Loader2,
  Users,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { cn } from "@repo/ui/lib/utils";

interface UserStats {
  user_id: string;
  full_name: string;
  login_id: string;
  work_days: number;
  holiday_count: number;
  weekend_work_days: number;
  individual_meals: number;
  remote_work_days: number;
  total_allowance: number;
  total_used: number;
  balance: number;
  has_excel_file: boolean;
  is_settled: boolean;
}

export default function UsersPage() {
  const router = useRouter();
  const currentDate = dayjs();
  const [selectedYear, setSelectedYear] = useState(currentDate.year());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month() + 1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleUserClick = (userId: string) => {
    router.push(`/calendar?userId=${userId}&year=${selectedYear}&month=${selectedMonth}`);
  };

  const { data: users, isLoading } = useQuery<UserStats[]>({
    queryKey: queryKeys.stats.monthly(selectedYear, selectedMonth),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/monthly?year=${selectedYear}&month=${selectedMonth}`
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const toggleSettlementMutation = useMutation({
    mutationFn: async ({
      userId,
      isSettled,
    }: {
      userId: string;
      isSettled: boolean;
    }) => {
      const response = await fetch("/api/settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          year: selectedYear,
          month: selectedMonth,
          isSettled,
        }),
      });
      if (!response.ok) throw new Error("Failed to update settlement status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthly(selectedYear, selectedMonth),
      });
      toast.success("정산 상태가 변경되었습니다.");
    },
    onError: () => {
      toast.error("정산 상태 변경에 실패했습니다.");
    },
  });

  const handleToggleSettlement = (userId: string, currentStatus: boolean) => {
    toggleSettlementMutation.mutate({
      userId,
      isSettled: !currentStatus,
    });
  };

  const filteredUsers = users?.filter((user) =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Summary stats
  const totalUsers = filteredUsers?.length || 0;
  const settledUsers = filteredUsers?.filter((u) => u.is_settled).length || 0;
  const totalUsed = filteredUsers?.reduce((sum, u) => sum + (u.total_used || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">총 인원</p>
            <p className="text-2xl font-bold text-slate-900">{totalUsers}명</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
            <Check className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">정산 완료</p>
            <p className="text-2xl font-bold text-slate-900">
              {settledUsers}
              <span className="ml-1 text-lg font-medium text-slate-400">
                / {totalUsers}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">총 사용액</p>
            <p className="text-2xl font-bold text-slate-900">
              {(totalUsed / 10000).toFixed(0)}
              <span className="ml-1 text-lg font-medium text-slate-400">만원</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Year Dropdown */}
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

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48 rounded-xl bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200/60 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
        <div className="max-h-[calc(100vh-360px)] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(241,245,249)]">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  성명
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  근무
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  휴일
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  주말
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  개별
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  재택
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  지원금
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  사용액
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  잔액
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  파일
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  정산
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 12 }).map((_, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => {
                  const balance = user.balance ?? 0;
                  return (
                    <tr
                      key={user.user_id || index}
                      className="table-row-interactive"
                    >
                      <td className="px-4 py-4 text-center text-sm text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleUserClick(user.user_id)}
                          className="flex items-center gap-3 group"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-bold text-slate-600 group-hover:from-amber-200 group-hover:to-amber-300 transition-colors">
                            {user.full_name?.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-900 group-hover:text-amber-600 transition-colors">
                            {user.full_name}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-slate-600">
                        {user.work_days ?? 0}일
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-slate-600">
                        {user.holiday_count ?? 0}일
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-slate-600">
                        {user.weekend_work_days ?? 0}일
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-slate-600">
                        {user.individual_meals ?? 0}회
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-slate-600">
                        {user.remote_work_days ?? 0}일
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-sky-600">
                        {formatCurrency(user.total_allowance)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-amber-600">
                        {formatCurrency(user.total_used)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-4 text-right text-sm font-bold",
                          balance >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {user.has_excel_file ? (
                          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50">
                            <FileSpreadsheet className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() =>
                            handleToggleSettlement(user.user_id, user.is_settled)
                          }
                          disabled={toggleSettlementMutation.isPending}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                            toggleSettlementMutation.isPending &&
                              toggleSettlementMutation.variables?.userId ===
                                user.user_id
                              ? "bg-slate-100 text-slate-500"
                              : user.is_settled
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {toggleSettlementMutation.isPending &&
                          toggleSettlementMutation.variables?.userId ===
                            user.user_id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              처리중
                            </>
                          ) : user.is_settled ? (
                            <>
                              <Check className="h-3 w-3" />
                              완료
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3" />
                              미정산
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
