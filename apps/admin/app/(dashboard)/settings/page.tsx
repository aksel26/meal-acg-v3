"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@repo/ui/src/calendar";
import { toast } from "sonner";
import {
  Save,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Minus,
  Equal,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@repo/ui/lib/utils";
import type { GlobalSettings } from "@/lib/supabase/types";

interface WorkdaysData {
  year: number;
  month: number;
  totalDays: number;
  weekendDays: number;
  holidayCount: number;
  actualWorkdays: number;
  holidays: Array<{ date: string; description: string }>;
}

interface MonthlyAllowanceData {
  allowance: number;
  workdays: number;
}

interface MonthlyAllowancesResponse {
  year: string;
  data: { [month: string]: MonthlyAllowanceData };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [dailyAllowance, setDailyAllowance] = useState<number>(10000);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);

  const calendarDate = useMemo(() => {
    return new Date(currentYear, currentMonth - 1, 1);
  }, [currentYear, currentMonth]);

  const { data: settings, isLoading } = useQuery<GlobalSettings>({
    queryKey: queryKeys.settings.global,
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  const { data: workdaysData, isLoading: isLoadingWorkdays } = useQuery<WorkdaysData>({
    queryKey: queryKeys.settings.workdays(currentYear, currentMonth),
    queryFn: async () => {
      const response = await fetch(`/api/settings/workdays?year=${currentYear}&month=${currentMonth}`);
      if (!response.ok) throw new Error("Failed to fetch workdays");
      return response.json();
    },
  });

  const { data: savedAllowances } = useQuery<MonthlyAllowancesResponse>({
    queryKey: queryKeys.settings.monthlyAllowances(currentYear, 0),
    queryFn: async () => {
      const response = await fetch(`/api/settings/monthly-allowances?year=${currentYear}`);
      if (!response.ok) throw new Error("Failed to fetch saved allowances");
      return response.json();
    },
  });

  const savedMonthData = useMemo(() => {
    return savedAllowances?.data?.[String(currentMonth)] || null;
  }, [savedAllowances, currentMonth]);

  useEffect(() => {
    if (settings) {
      setDailyAllowance(settings.daily_allowance);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (newAllowance: number) => {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyAllowance: newAllowance }),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.global });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      toast.success("설정이 저장되었습니다.");
    },
    onError: () => {
      toast.error("설정 저장 중 오류가 발생했습니다.");
    },
  });

  const saveAllowancesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/settings/monthly-allowances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: currentYear,
          month: currentMonth,
          dailyAllowance,
          actualWorkdays: workdaysData?.actualWorkdays || 0,
        }),
      });
      if (!response.ok) throw new Error("Failed to save monthly allowances");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.monthlyAllowances(currentYear, 0) });
      toast.success(data.message || "월별 지원금이 저장되었습니다.");
    },
    onError: () => {
      toast.error("월별 지원금 저장 중 오류가 발생했습니다.");
    },
  });

  const handleSave = () => {
    if (dailyAllowance < 0) {
      toast.error("일일 식대 단가는 0원 이상이어야 합니다.");
      return;
    }
    updateMutation.mutate(dailyAllowance);
  };

  const handleSaveMonthlyAllowances = () => {
    if (!workdaysData?.actualWorkdays) {
      toast.error("근무일수 정보를 불러오는 중입니다.");
      return;
    }
    saveAllowancesMutation.mutate();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const hasChanges = settings && dailyAllowance !== settings.daily_allowance;

  const holidayDates = useMemo(() => {
    return (workdaysData?.holidays || []).map((h) => new Date(h.date));
  }, [workdaysData?.holidays]);

  const totalAllowance = useMemo(() => {
    if (!workdaysData?.actualWorkdays) return 0;
    return dailyAllowance * workdaysData.actualWorkdays;
  }, [dailyAllowance, workdaysData?.actualWorkdays]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const needsUpdate =
    savedMonthData &&
    (savedMonthData.workdays !== workdaysData?.actualWorkdays ||
      savedMonthData.allowance !== totalAllowance);

  return (
    <div className="space-y-8">
      {/* 일일 식대 단가 설정 */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">일일 식대 단가</h2>
          <p className="mt-1 text-sm text-slate-500">
            모든 사용자의 월별 지원금 계산에 적용됩니다
          </p>
        </div>

        {isLoading ? (
          <div className="h-12 w-48 animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] max-w-xs">
              <label htmlFor="dailyAllowance" className="mb-2 block text-sm font-medium text-slate-600">
                금액
              </label>
              <div className="relative">
                <input
                  id="dailyAllowance"
                  type="number"
                  value={dailyAllowance}
                  onChange={(e) => setDailyAllowance(parseInt(e.target.value) || 0)}
                  min={0}
                  step={1000}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-lg font-semibold text-slate-900 transition-all focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  원/일
                </span>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all",
                hasChanges
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              )}
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        )}
      </section>

      {/* 월별 지원금 계산 */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">월별 지원금 계산</h2>
            <p className="mt-1 text-sm text-slate-500">
              근무일수 기반으로 월별 총 지원금을 계산합니다
            </p>
          </div>

          {/* 월 선택 */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-50 p-1">
            <button
              onClick={handlePrevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[100px] text-center text-sm font-semibold text-slate-700">
              {currentYear}년 {currentMonth}월
            </span>
            <button
              onClick={handleNextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 달력 */}
          <div>
            <Calendar
              mode="single"
              month={calendarDate}
              onMonthChange={(date) => {
                setCurrentYear(date.getFullYear());
                setCurrentMonth(date.getMonth() + 1);
              }}
              modifiers={{
                holiday: holidayDates,
                weekend: (date) => date.getDay() === 0 || date.getDay() === 6,
              }}
              modifiersClassNames={{
                holiday: "bg-slate-100 text-slate-400 line-through",
                weekend: "text-slate-300",
              }}
              disabled={(date) => {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isHoliday = holidayDates.some(
                  (h) => h.toDateString() === date.toDateString()
                );
                return isWeekend || isHoliday;
              }}
              className="rounded-xl border border-slate-200"
            />

            {workdaysData?.holidays && workdaysData.holidays.length > 0 && (
              <div className="mt-4 space-y-1">
                {workdaysData.holidays.map((holiday) => (
                  <div
                    key={holiday.date}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-500">{holiday.date}</span>
                    <span className="text-slate-600">{holiday.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 계산 결과 */}
          <div className="space-y-4">
            {isLoadingWorkdays ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : (
              <>
                {/* 계산 공식 시각화 */}
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    근무일 계산
                  </div>
                  <div className="flex items-center gap-3 text-lg">
                    <div className="text-center">
                      <div className="font-bold text-slate-900">{workdaysData?.totalDays || 0}</div>
                      <div className="text-xs text-slate-400">전체</div>
                    </div>
                    <Minus className="h-4 w-4 text-slate-300" />
                    <div className="text-center">
                      <div className="font-bold text-slate-900">{workdaysData?.weekendDays || 0}</div>
                      <div className="text-xs text-slate-400">주말</div>
                    </div>
                    <Minus className="h-4 w-4 text-slate-300" />
                    <div className="text-center">
                      <div className="font-bold text-slate-900">{workdaysData?.holidayCount || 0}</div>
                      <div className="text-xs text-slate-400">공휴일</div>
                    </div>
                    <Equal className="h-4 w-4 text-slate-300" />
                    <div className="text-center rounded-lg bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200">
                      <div className="font-bold text-slate-900">{workdaysData?.actualWorkdays || 0}</div>
                      <div className="text-xs text-slate-400">근무일</div>
                    </div>
                  </div>
                </div>

                {/* 지원금 계산 */}
                <div className="rounded-xl bg-slate-900 p-4 text-white">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    총 지원금
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{formatCurrency(totalAllowance)}</span>
                    <span className="text-slate-400">원</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {formatCurrency(dailyAllowance)}원 × {workdaysData?.actualWorkdays || 0}일
                  </div>
                </div>

                {/* 저장 상태 */}
                {savedMonthData && (
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-xl p-4",
                      needsUpdate ? "bg-amber-50" : "bg-slate-50"
                    )}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-700">저장된 값</div>
                      <div className="text-sm text-slate-500">
                        {savedMonthData.workdays}일 / {formatCurrency(savedMonthData.allowance)}원
                      </div>
                    </div>
                    {needsUpdate ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        변경됨
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                        <Check className="h-4 w-4" />
                        최신
                      </div>
                    )}
                  </div>
                )}

                {/* 저장 버튼 */}
                <button
                  onClick={handleSaveMonthlyAllowances}
                  disabled={saveAllowancesMutation.isPending || !workdaysData?.actualWorkdays}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all",
                    workdaysData?.actualWorkdays
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "cursor-not-allowed bg-slate-100 text-slate-400"
                  )}
                >
                  <Save className="h-4 w-4" />
                  {saveAllowancesMutation.isPending ? "저장 중..." : `${currentMonth}월 지원금 저장`}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 연간 현황 */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">{currentYear}년 월별 현황</h2>
          <p className="mt-1 text-sm text-slate-500">
            월을 클릭하여 해당 월의 지원금을 설정하세요
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const monthData = savedAllowances?.data?.[String(month)];
            const isCurrentMonth = month === currentMonth;
            const isSaved = !!monthData;

            return (
              <button
                key={month}
                onClick={() => setCurrentMonth(month)}
                className={cn(
                  "relative rounded-xl p-3 text-center transition-all",
                  isCurrentMonth
                    ? "bg-slate-900 text-white shadow-lg"
                    : isSaved
                    ? "bg-slate-50 text-slate-900 hover:bg-slate-100"
                    : "bg-white text-slate-400 ring-1 ring-slate-100 hover:ring-slate-200"
                )}
              >
                <div className="text-sm font-bold">{month}월</div>
                {monthData && (
                  <div className={cn("mt-1 text-xs", isCurrentMonth ? "text-slate-300" : "text-slate-500")}>
                    {(monthData.allowance / 10000).toFixed(0)}만
                  </div>
                )}
                {isSaved && !isCurrentMonth && (
                  <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-slate-400" />
                )}
              </button>
            );
          })}
        </div>

        {savedAllowances?.data && Object.keys(savedAllowances.data).length > 0 && (
          <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-5 py-4">
            <span className="text-sm font-medium text-slate-600">연간 총 지원금</span>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(
                Object.values(savedAllowances.data).reduce((sum, d) => sum + (d?.allowance || 0), 0)
              )}
              <span className="ml-1 text-sm font-normal text-slate-500">원</span>
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
