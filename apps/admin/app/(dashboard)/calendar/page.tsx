"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Skeleton } from "@repo/ui/src/skeleton";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Trash2, Search, X, Check } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import type { MealLog, Member } from "@/lib/supabase/types";

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
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [formData, setFormData] = useState<MealFormData>(initialFormData);

  // 사용자 검색 관련 state
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch members
  const { data: members } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const response = await fetch("/api/members");
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
  });

  // 검색어로 멤버 필터링 (일반 검색 + 초성 검색)
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!searchQuery.trim()) return members;

    const query = searchQuery.trim();
    return members.filter((member) => {
      const name = member.full_name || "";
      // 일반 검색 (대소문자 무시)
      if (name.toLowerCase().includes(query.toLowerCase())) return true;
      // 초성 검색: 이름의 초성이 검색어로 시작하는지 확인
      const nameChoseong = getChoseong(name);
      if (nameChoseong.includes(query)) return true;
      return false;
    });
  }, [members, searchQuery]);

  // 선택된 사용자 이름
  const selectedUserName = useMemo(() => {
    if (!selectedUserId || !members) return "";
    const member = members.find((m) => m.id === selectedUserId);
    return member?.full_name || "";
  }, [selectedUserId, members]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch meal logs for selected user and month
  const { data: mealLogs, isLoading: isLoadingLogs } = useQuery<MealLog[]>({
    queryKey: queryKeys.mealLogs.byUserAndMonth(
      selectedUserId,
      currentDate.year(),
      currentDate.month() + 1
    ),
    queryFn: async () => {
      if (!selectedUserId) return [];
      const response = await fetch(
        `/api/meal-logs?userId=${selectedUserId}&year=${currentDate.year()}&month=${currentDate.month() + 1}`
      );
      if (!response.ok) throw new Error("Failed to fetch meal logs");
      return response.json();
    },
    enabled: !!selectedUserId,
  });

  // Create/Update meal log mutation
  const saveMutation = useMutation({
    mutationFn: async (data: MealFormData) => {
      const url = editingLog ? `/api/meal-logs/${editingLog.id}` : "/api/meal-logs";
      const method = editingLog ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.userId,
          entryDate: data.entryDate,
          attendance: data.attendance || null,
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
          currentDate.month() + 1
        ),
      });
      toast.success(editingLog ? "식대 정보가 수정되었습니다." : "식대 정보가 저장되었습니다.");
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
          currentDate.month() + 1
        ),
      });
      toast.success("식대 정보가 삭제되었습니다.");
    },
    onError: () => {
      toast.error("삭제 중 오류가 발생했습니다.");
    },
  });

  const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, "month"));
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
      setFormData({
        userId: existingLog.user_id,
        entryDate: existingLog.entry_date,
        attendance: existingLog.attendance || "",
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
      <div className="flex items-center gap-4">
        <Label>사용자 선택</Label>
        <div className="relative" ref={dropdownRef}>
          {/* 선택된 사용자 표시 또는 검색 입력 */}
          <div
            className="flex items-center w-64 h-10 px-3 border rounded-lg bg-white cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => setIsDropdownOpen(true)}
          >
            <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            {isDropdownOpen ? (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름 또는 초성 검색..."
                className="flex-1 outline-none text-sm bg-transparent"
                autoFocus
              />
            ) : (
              <span className={`flex-1 text-sm truncate ${selectedUserName ? "text-gray-900" : "text-gray-400"}`}>
                {selectedUserName || "사용자 선택..."}
              </span>
            )}
            {selectedUserId && !isDropdownOpen && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUserId("");
                  setSearchQuery("");
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {/* 드롭다운 목록 */}
          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  검색 결과가 없습니다
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => {
                      setSelectedUserId(member.id);
                      setSearchQuery("");
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors ${
                      selectedUserId === member.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="text-sm">{member.full_name}</span>
                    {selectedUserId === member.id && (
                      <Check className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{currentDate.format("YYYY년 M월")}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            날짜를 클릭하여 식대 정보를 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
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

              // 근태별 배경색
              const getAttendanceBg = (attendance: string | null | undefined) => {
                if (!attendance) return { bg: "bg-gray-100", text: "text-gray-600" };
                const lower = attendance.toLowerCase();
                if (lower.includes("출근") || lower.includes("근무")) {
                  return { bg: "bg-emerald-100", text: "text-emerald-700" };
                }
                if (lower.includes("재택") || lower.includes("홈")) {
                  return { bg: "bg-amber-100", text: "text-amber-700" };
                }
                if (lower.includes("휴가") || lower.includes("연차")) {
                  return { bg: "bg-sky-100", text: "text-sky-700" };
                }
                if (lower.includes("반차")) {
                  return { bg: "bg-violet-100", text: "text-violet-700" };
                }
                return { bg: "bg-gray-100", text: "text-gray-600" };
              };

              const hasBreakfast = mealLog?.breakfast_amount && mealLog.breakfast_amount > 0;
              const hasLunch = mealLog?.lunch_amount && mealLog.lunch_amount > 0;
              const hasDinner = mealLog?.dinner_amount && mealLog.dinner_amount > 0;

              // 금액 포맷
              const formatAmount = (amount: number) => {
                if (amount >= 10000) return `${(amount / 10000).toFixed(1)}만`;
                return amount.toLocaleString();
              };

              return (
                <div
                  key={day}
                  onClick={() => handleDateClick(dateStr)}
                  className={`h-[104px] border rounded-xl p-2 cursor-pointer transition-all duration-200 ${
                    isWeekend ? "bg-slate-50/50" : "bg-white"
                  } hover:border-blue-400 hover:shadow-sm ${
                    mealLog ? "border-emerald-200" : "border-gray-100"
                  }`}
                >
                  {/* 날짜 */}
                  <div
                    className={`text-sm font-semibold mb-1 ${
                      dayOfWeek === 0
                        ? "text-rose-500"
                        : dayOfWeek === 6
                        ? "text-blue-500"
                        : "text-gray-700"
                    }`}
                  >
                    {day}
                  </div>

                  {isLoadingLogs && selectedUserId ? (
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-12 rounded-full" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ) : mealLog ? (
                    <div className="space-y-1">
                      {/* 근태 배지 - 원본 텍스트 그대로 */}
                      {mealLog.attendance && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${getAttendanceBg(mealLog.attendance).bg} ${getAttendanceBg(mealLog.attendance).text}`}>
                          {mealLog.attendance}
                        </span>
                      )}

                      {/* 총 금액 */}
                      {mealLog.total_amount && mealLog.total_amount > 0 && (
                        <div className="text-xs font-bold text-emerald-600">
                          {formatAmount(mealLog.total_amount)}원
                        </div>
                      )}

                      {/* 식사별 문구 */}
                      <div className="flex flex-wrap gap-x-1.5 text-[9px] text-gray-500">
                        {hasBreakfast && <span>조식</span>}
                        {hasLunch && <span>중식</span>}
                        {hasDinner && <span>석식</span>}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Meal Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLog ? "식대 정보 수정" : "식대 정보 입력"}
            </DialogTitle>
            <DialogDescription>
              {selectedDate} 식대 정보를 {editingLog ? "수정" : "입력"}합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Attendance */}
            <div className="space-y-2">
              <Label>근태</Label>
              <Input
                value={formData.attendance}
                onChange={(e) =>
                  setFormData({ ...formData, attendance: e.target.value })
                }
                placeholder="근태 상태 (예: 출근, 휴가, 재택)"
              />
            </div>

            {/* Breakfast */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">아침</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">가게</Label>
                  <Input
                    value={formData.breakfastStore}
                    onChange={(e) =>
                      setFormData({ ...formData, breakfastStore: e.target.value })
                    }
                    placeholder="가게명"
                  />
                </div>
                <div>
                  <Label className="text-xs">금액</Label>
                  <Input
                    type="number"
                    value={formData.breakfastAmount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        breakfastAmount: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">결제자</Label>
                  <Input
                    value={formData.breakfastPayer}
                    onChange={(e) =>
                      setFormData({ ...formData, breakfastPayer: e.target.value })
                    }
                    placeholder="결제자"
                  />
                </div>
              </div>
            </div>

            {/* Lunch */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">점심</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">가게</Label>
                  <Input
                    value={formData.lunchStore}
                    onChange={(e) =>
                      setFormData({ ...formData, lunchStore: e.target.value })
                    }
                    placeholder="가게명"
                  />
                </div>
                <div>
                  <Label className="text-xs">금액</Label>
                  <Input
                    type="number"
                    value={formData.lunchAmount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lunchAmount: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">결제자</Label>
                  <Input
                    value={formData.lunchPayer}
                    onChange={(e) =>
                      setFormData({ ...formData, lunchPayer: e.target.value })
                    }
                    placeholder="결제자"
                  />
                </div>
              </div>
            </div>

            {/* Dinner */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">저녁</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">가게</Label>
                  <Input
                    value={formData.dinnerStore}
                    onChange={(e) =>
                      setFormData({ ...formData, dinnerStore: e.target.value })
                    }
                    placeholder="가게명"
                  />
                </div>
                <div>
                  <Label className="text-xs">금액</Label>
                  <Input
                    type="number"
                    value={formData.dinnerAmount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dinnerAmount: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">결제자</Label>
                  <Input
                    value={formData.dinnerPayer}
                    onChange={(e) =>
                      setFormData({ ...formData, dinnerPayer: e.target.value })
                    }
                    placeholder="결제자"
                  />
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="pt-4 border-t">
              <div className="flex justify-between text-lg font-semibold">
                <span>총 금액</span>
                <span>
                  {(
                    (formData.breakfastAmount || 0) +
                    (formData.lunchAmount || 0) +
                    (formData.dinnerAmount || 0)
                  ).toLocaleString()}
                  원
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {editingLog && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
