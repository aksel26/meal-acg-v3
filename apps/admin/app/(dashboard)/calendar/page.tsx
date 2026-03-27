"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getChoseong } from "es-hangul";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Skeleton } from "@repo/ui/src/skeleton";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import { DatePicker } from "@repo/ui/src/date-picker";
import { toast } from "@repo/ui/src/sonner";
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  ListPlus,
  Briefcase,
  Home,
  Sun,
  Clock,
  UtensilsCrossed,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import type { MealLog, Member, Holiday } from "@/lib/supabase/types";

interface MealFormData {
  userId: string;
  entryDate: string;
  attendance: string;
  breakfastStore: string;
  breakfastAmount: number;
  breakfastPayer: string;
  lunchStore: string;
  lunchAmount: number;
  lunchPayer: string;
  dinnerStore: string;
  dinnerAmount: number;
  dinnerPayer: string;
}

/** 폼 UI 값 → DB 저장 값 매핑 */
const mapFormValueToAttendance = (formValue: string): string | null => {
  switch (formValue) {
    case "출근":
      return "근무";
    case "개별식사":
      return "근무(개별식사 / 식사안함)";
    case "재택":
      return "재택근무";
    case "휴가":
      return "연차/휴무";
    case "오전반차":
      return "오전 반차/휴무";
    case "오후반차":
      return "오후 반차/휴무";
    default:
      return formValue || null;
  }
};

const initialFormData: MealFormData = {
  userId: "",
  entryDate: "",
  attendance: "",
  breakfastStore: "",
  breakfastAmount: 0,
  breakfastPayer: "",
  lunchStore: "",
  lunchAmount: 0,
  lunchPayer: "",
  dinnerStore: "",
  dinnerAmount: 0,
  dinnerPayer: "",
};

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarPageContent />
    </Suspense>
  );
}

function CalendarPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // URL 파라미터에서 초기값 가져오기
  const initialUserId = searchParams.get("userId") || "";
  const initialYear = searchParams.get("year");
  const initialMonth = searchParams.get("month");

  const [currentDate, setCurrentDate] = useState(() => {
    if (initialYear && initialMonth) {
      return dayjs()
        .year(parseInt(initialYear))
        .month(parseInt(initialMonth) - 1);
    }
    return dayjs();
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [formData, setFormData] = useState<MealFormData>(initialFormData);

  // 일괄 입력 관련 state
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkExcludedIds, setBulkExcludedIds] = useState<string[]>([]);
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");
  const [bulkDate, setBulkDate] = useState("");
  const [bulkAmount, setBulkAmount] = useState<number>(0);
  const [bulkStore, setBulkStore] = useState("");
  const [bulkPayer, setBulkPayer] = useState("");
  const [bulkAttendance, setBulkAttendance] = useState("출근");

  // URL 파라미터가 변경되면 상태 업데이트
  useEffect(() => {
    const userId = searchParams.get("userId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (userId) {
      setSelectedUserId(userId);
    }
    if (year && month) {
      setCurrentDate(
        dayjs()
          .year(parseInt(year))
          .month(parseInt(month) - 1),
      );
    }
  }, [searchParams]);

  // Fetch members (특이사항 인원 제외)
  const { data: members } = useQuery<Member[]>({
    queryKey: queryKeys.members.active,
    queryFn: async () => {
      const response = await fetch("/api/members?exclude_status=true");
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
  });

  // Fetch holidays for current month
  const { data: holidays } = useQuery<Holiday[]>({
    queryKey: queryKeys.holidays.byMonth(
      currentDate.year(),
      currentDate.month() + 1,
    ),
    queryFn: async () => {
      const response = await fetch(
        `/api/holidays?year=${currentDate.year()}&month=${currentDate.month() + 1}`,
      );
      if (!response.ok) throw new Error("Failed to fetch holidays");
      return response.json();
    },
  });

  // 공휴일 맵 생성 (날짜 -> 설명)
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    holidays?.forEach((h) => {
      map.set(h.holiday_date, h.description);
    });
    return map;
  }, [holidays]);

  // Fetch meal logs for selected user and month
  const { data: mealLogs, isLoading: isLoadingLogs } = useQuery<MealLog[]>({
    queryKey: queryKeys.mealLogs.byUserAndMonth(
      selectedUserId,
      currentDate.year(),
      currentDate.month() + 1,
    ),
    queryFn: async () => {
      if (!selectedUserId) return [];
      const response = await fetch(
        `/api/meal-logs?userId=${selectedUserId}&year=${currentDate.year()}&month=${currentDate.month() + 1}`,
      );
      if (!response.ok) throw new Error("Failed to fetch meal logs");
      return response.json();
    },
    enabled: !!selectedUserId,
  });

  // Create/Update meal log mutation
  const saveMutation = useMutation({
    mutationFn: async (data: MealFormData) => {
      const url = editingLog
        ? `/api/meal-logs/${editingLog.id}`
        : "/api/meal-logs";
      const method = editingLog ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.userId,
          entryDate: data.entryDate,
          attendance: mapFormValueToAttendance(data.attendance),
          breakfastStore: data.breakfastStore || null,
          breakfastAmount: data.breakfastAmount || 0,
          breakfastPayer: data.breakfastPayer || null,
          lunchStore: data.lunchStore || null,
          lunchAmount: data.lunchAmount || 0,
          lunchPayer: data.lunchPayer || null,
          dinnerStore: data.dinnerStore || null,
          dinnerAmount: data.dinnerAmount || 0,
          dinnerPayer: data.dinnerPayer || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save meal log");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.mealLogs.byUserAndMonth(
          selectedUserId,
          currentDate.year(),
          currentDate.month() + 1,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthly(
          currentDate.year(),
          currentDate.month() + 1,
        ),
      });
      toast.success(
        editingLog
          ? "식대 정보가 수정되었습니다."
          : "식대 정보가 저장되었습니다.",
      );
      handleCloseDialog();
    },
    onError: () => {
      toast.error("저장 중 오류가 발생했습니다.");
    },
  });

  // Delete meal log mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/meal-logs/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete meal log");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.mealLogs.byUserAndMonth(
          selectedUserId,
          currentDate.year(),
          currentDate.month() + 1,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthly(
          currentDate.year(),
          currentDate.month() + 1,
        ),
      });
      toast.success("식대 정보가 삭제되었습니다.");
    },
    onError: () => {
      toast.error("삭제 중 오류가 발생했습니다.");
    },
  });

  // Bulk create meal logs mutation
  const bulkMutation = useMutation({
    mutationFn: async (data: {
      excludedUserIds: string[];
      entryDate: string;
      attendance: string;
      lunchAmount: number;
      lunchStore: string;
      lunchPayer: string;
    }) => {
      const response = await fetch("/api/meal-logs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create bulk meal logs");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.mealLogs.byUserAndMonth(
          selectedUserId,
          currentDate.year(),
          currentDate.month() + 1,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthly(
          currentDate.year(),
          currentDate.month() + 1,
        ),
      });
      toast.success(`${data.count}명의 식대 정보가 일괄 입력되었습니다.`);
      handleCloseBulkDialog();
    },
    onError: () => {
      toast.error("일괄 입력 중 오류가 발생했습니다.");
    },
  });

  // 일괄 입력 다이얼로그 닫기
  const handleCloseBulkDialog = () => {
    setIsBulkDialogOpen(false);
    setBulkExcludedIds([]);
    setBulkSearchQuery("");
    setBulkDate("");
    setBulkAmount(0);
    setBulkStore("");
    setBulkPayer("");
    setBulkAttendance("출근");
  };

  // 일괄 입력 실행
  const handleBulkSave = () => {
    if (!bulkDate) {
      toast.error("날짜를 선택해주세요.");
      return;
    }
    bulkMutation.mutate({
      excludedUserIds: bulkExcludedIds,
      entryDate: bulkDate,
      attendance: mapFormValueToAttendance(bulkAttendance) || "근무",
      lunchAmount: bulkAmount,
      lunchStore: bulkStore,
      lunchPayer: bulkPayer,
    });
  };

  // 멤버 제외/포함 토글
  const toggleExcludeMember = (memberId: string) => {
    setBulkExcludedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  // 일괄 입력 다이얼로그 내 멤버 필터링
  const bulkFilteredMembers = useMemo(() => {
    if (!members) return [];
    if (!bulkSearchQuery.trim()) return members;

    const query = bulkSearchQuery.trim();
    return members.filter((member) => {
      const name = member.full_name || "";
      if (name.toLowerCase().includes(query.toLowerCase())) return true;
      const nameChoseong = getChoseong(name);
      if (nameChoseong.includes(query)) return true;
      return false;
    });
  }, [members, bulkSearchQuery]);

  // 제외된 멤버 목록
  const excludedMembers = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => bulkExcludedIds.includes(m.id));
  }, [members, bulkExcludedIds]);

  const handlePrevMonth = () =>
    setCurrentDate(currentDate.subtract(1, "month"));
  const handleNextMonth = () => setCurrentDate(currentDate.add(1, "month"));

  const handleDateClick = (date: string) => {
    if (!selectedUserId) {
      toast.error("사용자를 먼저 선택해주세요.");
      return;
    }

    setSelectedDate(date);
    const existingLog = mealLogs?.find((log) => log.entry_date === date);

    if (existingLog) {
      setEditingLog(existingLog);
      // DB 근태 값을 폼 옵션으로 매핑
      const mapAttendanceToFormValue = (dbValue: string | null): string => {
        if (!dbValue) return "";
        const value = dbValue.trim();
        // 개별식사 관련
        if (value.includes("개별")) return "개별식사";
        // 출근/근무 관련
        if (value === "출근" || value === "근무") return "출근";
        // 재택 관련
        if (value.includes("재택") || value.includes("홈")) return "재택";
        // 휴가/연차 관련
        if (
          value.includes("휴가") ||
          value.includes("연차") ||
          value === "휴무"
        )
          return "휴가";
        // 오전반차
        if (value.includes("오전") && value.includes("반차")) return "오전반차";
        // 오후반차
        if (value.includes("오후") && value.includes("반차")) return "오후반차";
        // 반차 (오전/오후 구분 없으면 오전반차로 기본)
        if (value.includes("반차")) return "오전반차";
        // 매핑되지 않으면 원래 값 반환
        return value;
      };

      setFormData({
        userId: existingLog.user_id,
        entryDate: existingLog.entry_date,
        attendance: mapAttendanceToFormValue(existingLog.attendance),
        breakfastStore: existingLog.breakfast_store || "",
        breakfastAmount: existingLog.breakfast_amount || 0,
        breakfastPayer: existingLog.breakfast_payer || "",
        lunchStore: existingLog.lunch_store || "",
        lunchAmount: existingLog.lunch_amount || 0,
        lunchPayer: existingLog.lunch_payer || "",
        dinnerStore: existingLog.dinner_store || "",
        dinnerAmount: existingLog.dinner_amount || 0,
        dinnerPayer: existingLog.dinner_payer || "",
      });
    } else {
      setEditingLog(null);
      setFormData({
        ...initialFormData,
        userId: selectedUserId,
        entryDate: date,
      });
    }

    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLog(null);
    setFormData(initialFormData);
  };

  const handleSave = () => {
    if (!formData.userId || !formData.entryDate) {
      toast.error("필수 정보를 입력해주세요.");
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (editingLog) {
      deleteMutation.mutate(editingLog.id);
      handleCloseDialog();
    }
  };

  // Calendar generation
  const daysInMonth = currentDate.daysInMonth();
  const firstDayOfMonth = currentDate.startOf("month").day();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getMealLogForDay = (day: number) => {
    const dateStr = currentDate.date(day).format("YYYY-MM-DD");
    return mealLogs?.find((log) => log.entry_date === dateStr);
  };

  return (
    <div className="space-y-6">
      {/* User Selection with Search */}
      <div className="flex gap-1 flex-col">
        <Label>사용자 선택</Label>
        <SearchableDropdown<Member>
          items={members ?? []}
          value={selectedUserId}
          getItemKey={(m) => m.id}
          getItemLabel={(m) => m.full_name}
          onSelect={(member) => setSelectedUserId(member.id)}
          onClear={() => setSelectedUserId("")}
          placeholder="사용자 선택..."
          searchPlaceholder="이름 또는 초성 검색..."
          emptyText="검색 결과가 없습니다"
          allowClear
          className="h-10 w-44"
        />
      </div>

      {/* Calendar */}
      <Card className="border-0 shadow-none">
        <CardHeader className="p-0">
          <div className="flex items-center justify-between">
            <CardTitle>{currentDate.format("YYYY년 M월")}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkDialogOpen(true)}
                className="gap-1.5 h-9"
              >
                <ListPlus className="h-4 w-4" />
                일괄 입력
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            날짜를 클릭하여 식대 정보를 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
              <div
                key={day}
                className={`text-center text-sm font-medium py-2 ${
                  i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty days */}
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} className="h-24" />
            ))}

            {/* Days */}
            {days.map((day) => {
              const dateStr = currentDate.date(day).format("YYYY-MM-DD");
              const mealLog = getMealLogForDay(day);
              const dayOfWeek = currentDate.date(day).day();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const holidayName = holidayMap.get(dateStr);
              const isHoliday = !!holidayName;

              // 근태별 스타일
              const getAttendanceInfo = (
                attendance: string | null | undefined,
              ) => {
                if (!attendance)
                  return {
                    Icon: Briefcase,
                    bg: "bg-gray-100",
                    text: "text-gray-500",
                    label: "",
                  };
                const lower = attendance.toLowerCase();
                if (lower.includes("개별"))
                  return {
                    Icon: UtensilsCrossed,
                    bg: "bg-slate-100",
                    text: "text-slate-500",
                    label: "개별",
                  };
                if (lower.includes("출근") || lower.includes("근무"))
                  return {
                    Icon: Briefcase,
                    bg: "bg-blue-50",
                    text: "text-blue-600",
                    label: "출근",
                  };
                if (lower.includes("재택") || lower.includes("홈"))
                  return {
                    Icon: Home,
                    bg: "bg-amber-50",
                    text: "text-amber-600",
                    label: "재택",
                  };
                if (
                  lower.includes("휴가") ||
                  lower.includes("연차") ||
                  lower === "휴무"
                )
                  return {
                    Icon: Sun,
                    bg: "bg-sky-50",
                    text: "text-sky-600",
                    label: "휴가",
                  };
                if (lower.includes("반차"))
                  return {
                    Icon: Clock,
                    bg: "bg-violet-50",
                    text: "text-violet-600",
                    label: lower.includes("오전") ? "오전" : "오후",
                  };
                return {
                  Icon: Briefcase,
                  bg: "bg-gray-100",
                  text: "text-gray-500",
                  label: "",
                };
              };

              const attInfo = mealLog?.attendance
                ? getAttendanceInfo(mealLog.attendance)
                : null;

              // 금액 포맷
              const formatAmount = (amount: number) => {
                return amount.toLocaleString();
              };

              const isToday = dateStr === dayjs().format("YYYY-MM-DD");

              const isNonWorkAttendance = ["연차", "휴무", "재택", "휴가"].some(
                (type) => mealLog?.attendance?.includes(type),
              );

              return (
                <div
                  key={day}
                  onClick={() => handleDateClick(dateStr)}
                  className={`h-28 flex flex-col rounded-lg p-1.5 cursor-pointer transition-all duration-150 hover:-translate-y-1 ${
                    isToday
                      ? "ring-2 ring-blue-500 bg-blue-50/30"
                      : isHoliday
                        ? "bg-rose-50/60"
                        : isWeekend
                          ? "bg-slate-100/60"
                          : "bg-slate-50/50"
                  }`}
                >
                  {/* 날짜 헤더 */}
                  <div className="flex items-center gap-1 px-0.5">
                    <span
                      className={`text-xs font-bold leading-none ${
                        isToday
                          ? "text-blue-600"
                          : isHoliday || dayOfWeek === 0
                            ? "text-rose-500"
                            : dayOfWeek === 6
                              ? "text-blue-500"
                              : "text-slate-600"
                      }`}
                    >
                      {day}
                    </span>
                    {isHoliday && (
                      <span
                        className="text-[7px] text-rose-400 truncate max-w-[40px] leading-none"
                        title={holidayName}
                      >
                        {holidayName}
                      </span>
                    )}
                    {isToday && (
                      <span className="rounded-full bg-blue-500 px-1 py-px text-[7px] font-bold text-white leading-none">
                        오늘
                      </span>
                    )}
                  </div>

                  {/* 내부 콘텐츠 영역 */}
                  <div className="mt-0.5 flex-1 flex flex-col gap-0.5 px-0.5">
                    {isLoadingLogs && selectedUserId ? (
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-3/4 rounded" />
                      </div>
                    ) : mealLog ? (
                      isNonWorkAttendance ? (
                        <div className="flex h-full items-center justify-center">
                          {attInfo && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${attInfo.bg} ${attInfo.text}`}
                            >
                              <attInfo.Icon className="h-4 w-4" />
                              <span className="text-xs font-semibold">
                                {attInfo.label}
                              </span>
                            </span>
                          )}
                        </div>
                      ) : (() => {
                        const isWork = attInfo?.label === "출근";
                        return (
                        <>
                          {attInfo && !isWork && (
                            <div
                              className={`flex items-center justify-between rounded px-2 py-1 ${attInfo.bg}`}
                            >
                              <span
                                className={`text-sm font-semibold ${attInfo.text}`}
                              >
                                {attInfo.label}
                              </span>
                            </div>
                          )}
                          {mealLog.breakfast_amount &&
                          mealLog.breakfast_amount > 0 ? (
                            <div className="flex items-center justify-between rounded bg-orange-50 px-2 py-1">
                              <span className="text-sm font-bold tabular-nums text-orange-700">
                                {formatAmount(mealLog.breakfast_amount)}
                              </span>
                              <span className="text-xs font-semibold text-orange-500">
                                조식
                              </span>
                            </div>
                          ) : mealLog.breakfast_store ? (
                            <div className="flex items-center justify-between rounded bg-orange-50/60 px-2 py-1">
                              <span className="text-sm font-bold tabular-nums text-orange-700/50">
                                0
                              </span>
                              <span className="text-xs font-semibold text-orange-400">
                                조식
                              </span>
                            </div>
                          ) : null}
                          {mealLog.lunch_amount && mealLog.lunch_amount > 0 ? (
                            <div className="flex items-center justify-between rounded bg-emerald-50 px-2 py-1">
                              <span className="text-sm font-bold tabular-nums text-emerald-700">
                                {formatAmount(mealLog.lunch_amount)}
                              </span>
                              <span className="text-xs font-semibold text-emerald-500">
                                중식
                              </span>
                            </div>
                          ) : (mealLog.lunch_store || isWork) ? (
                            <div className="flex items-center justify-between rounded bg-emerald-50/60 px-2 py-1">
                              <span className="text-sm font-bold tabular-nums text-emerald-700/50">
                                0
                              </span>
                              <span className="text-xs font-semibold text-emerald-400">
                                중식
                              </span>
                            </div>
                          ) : null}
                          {mealLog.dinner_amount &&
                          mealLog.dinner_amount > 0 ? (
                            <div className="flex items-center justify-between rounded bg-indigo-50 px-2 py-1">
                              <span className="text-sm font-bold tabular-nums text-indigo-700">
                                {formatAmount(mealLog.dinner_amount)}
                              </span>
                              <span className="text-xs font-semibold text-indigo-500">
                                석식
                              </span>
                            </div>
                          ) : mealLog.dinner_store ? (
                            <div className="flex items-center justify-between rounded bg-indigo-50/60 px-2 py-1">
                              <span className="text-sm font-bold tabular-nums text-indigo-700/50">
                                0
                              </span>
                              <span className="text-xs font-semibold text-indigo-400">
                                석식
                              </span>
                            </div>
                          ) : null}
                        </>
                        );
                      })()
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Entry Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-100">
            <DialogTitle className="text-base font-semibold text-slate-900">
              식대 일괄 입력
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-0.5">
              제외할 멤버를 선택하고 날짜와 금액을 입력하세요
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-200px)] overflow-y-auto">
            {/* 날짜 및 금액 입력 */}
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-xs font-medium text-slate-500 mb-2 block">
                    날짜
                  </Label>
                  <DatePicker
                    value={bulkDate}
                    onChange={(val) => setBulkDate(val)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 mb-2 block">
                    점심 금액
                  </Label>
                  <Input
                    type="number"
                    value={bulkAmount || ""}
                    onChange={(e) =>
                      setBulkAmount(parseInt(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-500 mb-2 block">
                    식당
                  </Label>
                  <Input
                    type="text"
                    value={bulkStore}
                    onChange={(e) => setBulkStore(e.target.value)}
                    placeholder="식당명"
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 mb-2 block">
                    결제자
                  </Label>
                  <Input
                    type="text"
                    value={bulkPayer}
                    onChange={(e) => setBulkPayer(e.target.value)}
                    placeholder="결제자"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* 근태 선택 */}
            <div className="px-6 py-4 border-b border-slate-100">
              <Label className="text-xs font-medium text-slate-500 mb-2.5 block">
                근태
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "출근",
                  "개별식사",
                  "재택",
                  "휴가",
                  "오전반차",
                  "오후반차",
                ].map((value) => {
                  const isSelected = bulkAttendance === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBulkAttendance(value)}
                      className={`
                          px-3 py-1.5 rounded text-sm transition-colors
                          ${
                            isSelected
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }
                        `}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 제외된 멤버 표시 */}
            {excludedMembers.length > 0 && (
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <Label className="text-xs font-medium text-slate-500 mb-2.5 block">
                  제외된 멤버 ({excludedMembers.length}명)
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {excludedMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleExcludeMember(member.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      {member.full_name}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 멤버 검색 및 선택 */}
            <div className="px-6 py-4">
              <Label className="text-xs font-medium text-slate-500 mb-2.5 block">
                제외할 멤버 선택
              </Label>
              <div className="mb-3">
                <Input
                  value={bulkSearchQuery}
                  onChange={(e) => setBulkSearchQuery(e.target.value)}
                  placeholder="이름 또는 초성 검색..."
                  className="h-9"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md">
                {bulkFilteredMembers.map((member) => {
                  const isExcluded = bulkExcludedIds.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleExcludeMember(member.id)}
                      className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                        isExcluded
                          ? "bg-red-50 hover:bg-red-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`text-sm ${isExcluded ? "text-red-700" : "text-slate-700"}`}
                      >
                        {member.full_name}
                      </span>
                      {isExcluded && (
                        <span className="text-xs text-red-500 font-medium">
                          제외됨
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">
                대상 인원: {(members?.length || 0) - bulkExcludedIds.length}명
              </span>
              {bulkAmount > 0 && (
                <span className="text-sm font-semibold text-slate-900">
                  {bulkAmount.toLocaleString()}원
                </span>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseBulkDialog}
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleBulkSave}
                disabled={bulkMutation.isPending || !bulkDate}
              >
                {bulkMutation.isPending ? "저장 중..." : "일괄 저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meal Entry Dialog - Minimal Style */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-100">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {selectedDate ? dayjs(selectedDate).format("M월 D일 (ddd)") : ""}{" "}
              식대
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-0.5">
              {editingLog ? "정보 수정" : "새로 입력"}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-200px)] overflow-y-auto">
            {/* Attendance */}
            <div className="px-6 py-4 border-b border-slate-100">
              <Label className="text-xs font-medium text-slate-500 mb-2.5 block">
                근태
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "출근",
                  "개별식사",
                  "재택",
                  "휴가",
                  "오전반차",
                  "오후반차",
                ].map((value) => {
                  const isSelected = formData.attendance === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          attendance: isSelected ? "" : value,
                        })
                      }
                      className={`
                        px-3 py-1.5 rounded text-sm transition-colors
                        ${
                          isSelected
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }
                      `}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meals */}
            <div>
              {/* Breakfast */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">
                    아침
                  </span>
                  {formData.breakfastAmount > 0 && (
                    <span className="text-sm font-semibold text-slate-900">
                      {formData.breakfastAmount.toLocaleString()}원
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={formData.breakfastStore}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        breakfastStore: e.target.value,
                      })
                    }
                    placeholder="가게"
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number"
                    value={formData.breakfastAmount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        breakfastAmount: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="금액"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={formData.breakfastPayer}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        breakfastPayer: e.target.value,
                      })
                    }
                    placeholder="결제자"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Lunch */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">
                    점심
                  </span>
                  {formData.lunchAmount > 0 && (
                    <span className="text-sm font-semibold text-slate-900">
                      {formData.lunchAmount.toLocaleString()}원
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={formData.lunchStore}
                    onChange={(e) =>
                      setFormData({ ...formData, lunchStore: e.target.value })
                    }
                    placeholder="가게"
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number"
                    value={formData.lunchAmount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lunchAmount: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="금액"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={formData.lunchPayer}
                    onChange={(e) =>
                      setFormData({ ...formData, lunchPayer: e.target.value })
                    }
                    placeholder="결제자"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Dinner */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">
                    저녁
                  </span>
                  {formData.dinnerAmount > 0 && (
                    <span className="text-sm font-semibold text-slate-900">
                      {formData.dinnerAmount.toLocaleString()}원
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={formData.dinnerStore}
                    onChange={(e) =>
                      setFormData({ ...formData, dinnerStore: e.target.value })
                    }
                    placeholder="가게"
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number"
                    value={formData.dinnerAmount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dinnerAmount: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="금액"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={formData.dinnerPayer}
                    onChange={(e) =>
                      setFormData({ ...formData, dinnerPayer: e.target.value })
                    }
                    placeholder="결제자"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-500">총 금액</span>
              <span className="text-xl font-bold text-slate-900">
                {(
                  (formData.breakfastAmount || 0) +
                  (formData.lunchAmount || 0) +
                  (formData.dinnerAmount || 0)
                ).toLocaleString()}
                원
              </span>
            </div>
            <div className="flex items-center gap-2">
              {editingLog && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={handleCloseDialog}>
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
