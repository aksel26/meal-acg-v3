"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/src/card";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Skeleton } from "@repo/ui/src/skeleton";
import { Calendar } from "@repo/ui/src/calendar";
import { toast } from "sonner";
import { Save, ChevronLeft, ChevronRight, CalendarDays, Users, Check, AlertCircle } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
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

  // 달력에서 선택된 날짜
  const calendarDate = useMemo(() => {
    return new Date(currentYear, currentMonth - 1, 1);
  }, [currentYear, currentMonth]);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<GlobalSettings>({
    queryKey: queryKeys.settings.global,
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  // Fetch workdays data
  const { data: workdaysData, isLoading: isLoadingWorkdays } = useQuery<WorkdaysData>({
    queryKey: queryKeys.settings.workdays(currentYear, currentMonth),
    queryFn: async () => {
      const response = await fetch(`/api/settings/workdays?year=${currentYear}&month=${currentMonth}`);
      if (!response.ok) throw new Error("Failed to fetch workdays");
      return response.json();
    },
  });

  // Fetch saved monthly allowances
  const { data: savedAllowances, isLoading: isLoadingSaved } = useQuery<MonthlyAllowancesResponse>({
    queryKey: queryKeys.settings.monthlyAllowances(currentYear, 0),
    queryFn: async () => {
      const response = await fetch(`/api/settings/monthly-allowances?year=${currentYear}`);
      if (!response.ok) throw new Error("Failed to fetch saved allowances");
      return response.json();
    },
  });

  // 현재 월의 저장된 데이터
  const savedMonthData = useMemo(() => {
    return savedAllowances?.data?.[String(currentMonth)] || null;
  }, [savedAllowances, currentMonth]);

  // Update settings when data is loaded
  useEffect(() => {
    if (settings) {
      setDailyAllowance(settings.daily_allowance);
    }
  }, [settings]);

  // Update settings mutation
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

  // Save monthly allowances mutation
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

  // 공휴일 날짜 배열 (달력 마킹용)
  const holidayDates = useMemo(() => {
    return (workdaysData?.holidays || []).map((h) => new Date(h.date));
  }, [workdaysData?.holidays]);

  // 총 지원금 계산
  const totalAllowance = useMemo(() => {
    if (!workdaysData?.actualWorkdays) return 0;
    return dailyAllowance * workdaysData.actualWorkdays;
  }, [dailyAllowance, workdaysData?.actualWorkdays]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 식대 설정 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>식대 설정</CardTitle>
            <CardDescription>
              일일 식대 지원금을 설정합니다. 이 설정은 모든 사용자의 월별 지원금 계산에 적용됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dailyAllowance">일일 식대 단가</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="dailyAllowance"
                      type="number"
                      value={dailyAllowance}
                      onChange={(e) => setDailyAllowance(parseInt(e.target.value) || 0)}
                      min={0}
                      step={1000}
                      className="max-w-xs"
                    />
                    <span className="text-gray-500">원</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    현재 설정: {settings?.daily_allowance.toLocaleString()}원/일
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 달력 및 근무일수 카드 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  월별 근무일수
                </CardTitle>
                <CardDescription>
                  달력을 넘기면 해당 월의 근무일수가 자동 계산됩니다.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[100px] text-center">
                  {currentYear}년 {currentMonth}월
                </span>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
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
                  holiday: "bg-red-100 text-red-600 font-medium",
                  weekend: "text-gray-400",
                }}
                disabled={(date) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isHoliday = holidayDates.some(
                    (h) => h.toDateString() === date.toDateString()
                  );
                  return isWeekend || isHoliday;
                }}
                className="rounded-md border"
              />

              {/* 공휴일 목록 */}
              {workdaysData?.holidays && workdaysData.holidays.length > 0 && (
                <div className="mt-4 w-full">
                  <h4 className="text-sm font-medium mb-2 text-gray-700">공휴일</h4>
                  <div className="space-y-1">
                    {workdaysData.holidays.map((holiday) => (
                      <div
                        key={holiday.date}
                        className="flex items-center justify-between text-sm bg-red-50 rounded px-3 py-1.5"
                      >
                        <span className="text-red-600">{holiday.date}</span>
                        <span className="text-gray-600">{holiday.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 근무일수 계산 결과 및 지원금 저장 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {currentYear}년 {currentMonth}월 지원금 계산
              </CardTitle>
              <CardDescription>
                실제 근무일수를 기반으로 월별 총 지원금을 계산하고 저장합니다.
              </CardDescription>
            </div>
            {savedMonthData && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                <Check className="h-4 w-4" />
                저장됨
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingWorkdays ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {workdaysData?.totalDays || 0}
                  </p>
                  <p className="text-sm text-gray-500">전체 일수</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {workdaysData?.weekendDays || 0}
                  </p>
                  <p className="text-sm text-gray-500">주말</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {workdaysData?.holidayCount || 0}
                  </p>
                  <p className="text-sm text-gray-500">공휴일</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {workdaysData?.actualWorkdays || 0}
                  </p>
                  <p className="text-sm text-gray-500">실제 근무일</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {totalAllowance.toLocaleString()}원
                  </p>
                  <p className="text-sm text-gray-500">총 지원금</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-2">계산 공식</h4>
                <p className="text-sm text-gray-600">
                  실제 근무일 ({workdaysData?.actualWorkdays || 0}일) = 전체 일수 (
                  {workdaysData?.totalDays || 0}일) - 주말 ({workdaysData?.weekendDays || 0}
                  일) - 공휴일 ({workdaysData?.holidayCount || 0}일)
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  총 지원금 ({totalAllowance.toLocaleString()}원) = 일일 식대 단가 (
                  {dailyAllowance.toLocaleString()}원) × 실제 근무일 (
                  {workdaysData?.actualWorkdays || 0}일)
                </p>
              </div>

              {/* 저장된 값과 비교 */}
              {savedMonthData && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium mb-2 text-blue-800">저장된 값</h4>
                  <p className="text-sm text-blue-600">
                    근무일: {savedMonthData.workdays}일 / 지원금: {savedMonthData.allowance.toLocaleString()}원
                  </p>
                  {(savedMonthData.workdays !== workdaysData?.actualWorkdays ||
                    savedMonthData.allowance !== totalAllowance) && (
                    <div className="flex items-center gap-2 mt-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">현재 계산값과 다릅니다. 다시 저장하세요.</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveMonthlyAllowances}
                  disabled={saveAllowancesMutation.isPending || !workdaysData?.actualWorkdays}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveAllowancesMutation.isPending
                    ? "저장 중..."
                    : `${currentMonth}월 지원금 저장`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 연간 지원금 현황 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>{currentYear}년 월별 지원금 현황</CardTitle>
          <CardDescription>
            저장된 월별 지원금 현황입니다. 미저장 월은 설정이 필요합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
              const monthData = savedAllowances?.data?.[String(month)];
              const isCurrentMonth = month === currentMonth;
              return (
                <button
                  key={month}
                  onClick={() => setCurrentMonth(month)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    isCurrentMonth
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : monthData
                      ? "bg-green-50 hover:bg-green-100"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-700">{month}월</p>
                  {monthData ? (
                    <>
                      <p className="text-xs text-gray-500 mt-1">{monthData.workdays}일</p>
                      <p className="text-sm font-semibold text-green-600">
                        {(monthData.allowance / 10000).toFixed(0)}만원
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">미설정</p>
                  )}
                </button>
              );
            })}
          </div>
          {savedAllowances?.data && Object.keys(savedAllowances.data).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                <strong>연간 총 지원금:</strong>{" "}
                {Object.values(savedAllowances.data)
                  .reduce((sum, d) => sum + (d?.allowance || 0), 0)
                  .toLocaleString()}
                원
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 설정 정보 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>설정 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>지원금 계산 방식:</strong> 실제 근무일수 × 일일 식대 단가
            </p>
            <p>
              <strong>실제 근무일수:</strong> 해당 월 전체 일수 - 주말 - 공휴일
            </p>
            <p>
              <strong>잔액:</strong> 총 지원금 - 사용 금액
            </p>
            <p className="text-amber-600">
              <strong>주의:</strong> 공휴일이 주말과 겹치는 경우 중복으로 계산되지 않습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
