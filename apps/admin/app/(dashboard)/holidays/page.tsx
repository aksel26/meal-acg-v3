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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import type { Holiday } from "@/lib/supabase/types";

export default function HolidaysPage() {
  const queryClient = useQueryClient();
  const currentYear = dayjs().year();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    holidayDate: "",
    description: "",
  });

  // Fetch holidays
  const { data: holidays, isLoading } = useQuery<Holiday[]>({
    queryKey: queryKeys.holidays.byYear(selectedYear),
    queryFn: async () => {
      const response = await fetch(`/api/holidays?year=${selectedYear}`);
      if (!response.ok) throw new Error("Failed to fetch holidays");
      return response.json();
    },
  });

  // Sync from Google Calendar
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/holidays/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: selectedYear }),
      });
      if (!response.ok) throw new Error("Failed to sync holidays");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.holidays.byYear(selectedYear),
      });
      toast.success(`${data.count}개의 공휴일이 동기화되었습니다.`);
    },
    onError: () => {
      toast.error("동기화 중 오류가 발생했습니다.");
    },
  });

  // Create/Update holiday
  const saveMutation = useMutation({
    mutationFn: async (data: { holidayDate: string; description: string }) => {
      const method = editingHoliday ? "PUT" : "POST";
      const response = await fetch("/api/holidays", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save holiday");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.holidays.byYear(selectedYear),
      });
      toast.success(editingHoliday ? "공휴일이 수정되었습니다." : "공휴일이 추가되었습니다.");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("저장 중 오류가 발생했습니다.");
    },
  });

  // Delete holiday
  const deleteMutation = useMutation({
    mutationFn: async (holidayDate: string) => {
      const response = await fetch(`/api/holidays?date=${holidayDate}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete holiday");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.holidays.byYear(selectedYear),
      });
      toast.success("공휴일이 삭제되었습니다.");
    },
    onError: () => {
      toast.error("삭제 중 오류가 발생했습니다.");
    },
  });

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        holidayDate: holiday.holiday_date,
        description: holiday.description,
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        holidayDate: "",
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingHoliday(null);
    setFormData({ holidayDate: "", description: "" });
  };

  const handleSave = () => {
    if (!formData.holidayDate || !formData.description) {
      toast.error("날짜와 공휴일명을 입력해주세요.");
      return;
    }
    saveMutation.mutate(formData);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
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
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            Google 동기화
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            공휴일 추가
          </Button>
        </div>
      </div>

      {/* Holidays Table */}
      <Card>
        <CardHeader>
          <CardTitle>공휴일 목록</CardTitle>
          <CardDescription>
            {selectedYear}년 공휴일 ({holidays?.length || 0}개)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>날짜</TableHead>
                <TableHead>요일</TableHead>
                <TableHead>공휴일명</TableHead>
                <TableHead className="w-24">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5} className="text-center">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ))
              ) : holidays && holidays.length > 0 ? (
                holidays.map((holiday, index) => {
                  const date = dayjs(holiday.holiday_date);
                  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][
                    date.day()
                  ];

                  return (
                    <TableRow key={holiday.holiday_date}>
                      <TableCell className="text-gray-500">{index + 1}</TableCell>
                      <TableCell>{date.format("YYYY-MM-DD")}</TableCell>
                      <TableCell
                        className={
                          date.day() === 0
                            ? "text-red-500"
                            : date.day() === 6
                            ? "text-blue-500"
                            : ""
                        }
                      >
                        {dayOfWeek}
                      </TableCell>
                      <TableCell className="font-medium">
                        {holiday.description}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(holiday)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(holiday.holiday_date)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    등록된 공휴일이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Holiday Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? "공휴일 수정" : "공휴일 추가"}
            </DialogTitle>
            <DialogDescription>
              공휴일 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="holidayDate">날짜</Label>
              <Input
                id="holidayDate"
                type="date"
                value={formData.holidayDate}
                onChange={(e) =>
                  setFormData({ ...formData, holidayDate: e.target.value })
                }
                disabled={!!editingHoliday}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">공휴일명</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="예: 설날"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
