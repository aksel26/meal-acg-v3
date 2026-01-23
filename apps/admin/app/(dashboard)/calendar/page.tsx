"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
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

  // Fetch members
  const { data: members } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const response = await fetch("/api/members");
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
  });

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
      {/* User Selection */}
      <div className="flex items-center gap-4">
        <Label>사용자 선택</Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="사용자 선택..." />
          </SelectTrigger>
          <SelectContent>
            {members?.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

              return (
                <div
                  key={day}
                  onClick={() => handleDateClick(dateStr)}
                  className={`h-24 border rounded-lg p-2 cursor-pointer transition-colors ${
                    isWeekend ? "bg-gray-50" : "bg-white"
                  } hover:border-blue-400 ${
                    mealLog ? "border-green-300 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div
                    className={`text-sm font-medium ${
                      dayOfWeek === 0
                        ? "text-red-500"
                        : dayOfWeek === 6
                        ? "text-blue-500"
                        : ""
                    }`}
                  >
                    {day}
                  </div>
                  {isLoadingLogs && selectedUserId ? (
                    <Skeleton className="h-3 w-full mt-1" />
                  ) : mealLog ? (
                    <div className="mt-1 text-xs text-gray-600 truncate">
                      {mealLog.total_amount?.toLocaleString()}원
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
