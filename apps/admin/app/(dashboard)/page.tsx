"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/src/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Skeleton } from "@repo/ui/src/skeleton";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";

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
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="flex items-center gap-4">
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedMonth.toString()}
          onValueChange={(value) => setSelectedMonth(parseInt(value))}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month} value={month.toString()}>
                {month}월
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 인원</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                `${stats?.totalMembers || 0}명`
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 지원금</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {isLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                formatCurrency(stats?.totalAllowance || 0)
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 사용 금액</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {isLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                formatCurrency(stats?.totalUsed || 0)
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 잔액</CardDescription>
            <CardTitle
              className={`text-3xl ${
                (stats?.totalBalance || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {isLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                formatCurrency(stats?.totalBalance || 0)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>월별 현황 요약</CardTitle>
          <CardDescription>
            {selectedYear}년 {selectedMonth}월 식대 사용 현황
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                평균 사용 금액:{" "}
                <span className="font-medium text-gray-900">
                  {formatCurrency(stats?.averageUsage || 0)}
                </span>
              </p>
              <p>
                지원금 대비 사용률:{" "}
                <span className="font-medium text-gray-900">
                  {stats?.totalAllowance
                    ? (
                        ((stats.totalUsed || 0) / stats.totalAllowance) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
