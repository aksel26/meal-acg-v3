"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
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
import { Badge } from "@repo/ui/src/badge";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/src/alert-dialog";
import { toast } from "@repo/ui/src/sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Lock,
  CalendarClock,
} from "lucide-react";
import { useUserStore } from "@/stores/userStore";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import {
  useDayoffs,
  useLeaveTypes,
  type DayoffRecord,
} from "@/hooks/use-dayoffs";
import {
  useCreateDayoff,
  useUpdateDayoff,
  useDeleteDayoff,
  useApproveDayoff,
} from "@/hooks/use-dayoff-mutations";
import { useQuery } from "@tanstack/react-query";

dayjs.locale("ko");

const LEAVE_TYPE_COLORS: Record<string, string> = {
  "지각/조퇴": "bg-orange-50 text-orange-700 border-orange-200",
  반차: "bg-purple-50 text-purple-700 border-purple-200",
  연차: "bg-yellow-50 text-yellow-700 border-yellow-200",
  대체휴무: "bg-blue-50 text-blue-700 border-blue-200",
  경조휴무: "bg-pink-50 text-pink-700 border-pink-200",
  특별휴무: "bg-teal-50 text-teal-700 border-teal-200",
  훈련: "bg-slate-50 text-slate-700 border-slate-200",
  휴무: "bg-green-50 text-green-700 border-green-200",
};

interface MemberOption {
  id: string;
  full_name: string;
}

interface FormData {
  targetId: string;
  startDate: string;
  endDate: string;
  leaveTypeId: number;
  lateHour: string;
  lateMinute: string;
  reason: string;
}

const defaultFormData: FormData = {
  targetId: "",
  startDate: "",
  endDate: "",
  leaveTypeId: 0,
  lateHour: "09",
  lateMinute: "00",
  reason: "",
};

export default function DayoffsPage() {
  const { userName } = useUserStore();
  const { data: memberInfo } = useMemberIdLookup(userName);
  const memberId = memberInfo?.id || "";

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DayoffRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);

  // All dayoffs for this month (for calendar view)
  const { data: dayoffs, isLoading } = useDayoffs(year, month);
  const { data: leaveTypes } = useLeaveTypes();

  // Member list for target selection
  const { data: members } = useQuery<MemberOption[]>({
    queryKey: ["points", "members"],
    queryFn: async () => {
      const res = await fetch("/api/points/members");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Mutations
  const createMutation = useCreateDayoff();
  const updateMutation = useUpdateDayoff();
  const deleteMutation = useDeleteDayoff();
  const approveMutation = useApproveDayoff();

  // Calendar
  const calendarDays = useMemo(() => {
    const start = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
    const daysInMonth = start.daysInMonth();
    const startDay = start.day();
    const days: { date: string; dayOfMonth: number; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startDay; i++) {
      const d = start.subtract(startDay - i, "day");
      days.push({ date: d.format("YYYY-MM-DD"), dayOfMonth: d.date(), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = start.date(i);
      days.push({ date: d.format("YYYY-MM-DD"), dayOfMonth: i, isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = start.add(1, "month").date(i);
      days.push({ date: d.format("YYYY-MM-DD"), dayOfMonth: i, isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  const dayoffsByDate = useMemo(() => {
    const map = new Map<string, DayoffRecord[]>();
    (dayoffs || []).forEach((d) => {
      const list = map.get(d.leave_date) || [];
      list.push(d);
      map.set(d.leave_date, list);
    });
    return map;
  }, [dayoffs]);

  const handlePrevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  const handleOpenCreate = (date?: string) => {
    setEditingRecord(null);
    setFormData({
      ...defaultFormData,
      targetId: memberId,
      startDate: date || "",
      endDate: date || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (record: DayoffRecord) => {
    if (record.approver_id) {
      toast.error("승인된 근태는 수정할 수 없습니다.");
      return;
    }
    setEditingRecord(record);
    setFormData({
      targetId: record.target_id,
      startDate: record.leave_date,
      endDate: record.leave_date,
      leaveTypeId: record.leave_type_id,
      lateHour: record.late_hour || "09",
      lateMinute: record.late_minute || "00",
      reason: record.reason || "",
    });
    setIsDialogOpen(true);
  };

  const handleCopy = (record: DayoffRecord) => {
    setEditingRecord(null);
    setFormData({
      targetId: record.target_id,
      startDate: "",
      endDate: "",
      leaveTypeId: record.leave_type_id,
      lateHour: record.late_hour || "09",
      lateMinute: record.late_minute || "00",
      reason: record.reason || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.targetId || !formData.startDate || !formData.leaveTypeId) {
      toast.error("대상자, 날짜, 근태 유형을 입력해주세요.");
      return;
    }

    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        editorId: memberId,
        leaveDate: formData.startDate,
        leaveTypeId: formData.leaveTypeId,
        lateHour: formData.lateHour,
        lateMinute: formData.lateMinute,
        reason: formData.reason,
      }, {
        onSuccess: () => setIsDialogOpen(false),
      });
    } else {
      createMutation.mutate({
        authorId: memberId,
        targetId: formData.targetId,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        leaveTypeId: formData.leaveTypeId,
        lateHour: formData.lateHour,
        lateMinute: formData.lateMinute,
        reason: formData.reason,
      }, {
        onSuccess: () => setIsDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleDeleteClick = (record: DayoffRecord) => {
    if (record.approver_id) {
      toast.error("승인된 근태는 삭제할 수 없습니다.");
      return;
    }
    setDeleteTarget(record.id);
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <CalendarClock className="h-5 w-5 text-slate-600" />
        <h1 className="text-lg font-bold text-slate-800">근태 관리</h1>
      </motion.div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1">
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="h-8 w-20 border-0 bg-transparent text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[year - 1, year, year + 1].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="h-8 w-16 border-0 bg-transparent text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m.toString()}>{m}월</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar View */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <div className="grid grid-cols-7 gap-px bg-slate-200/50">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
            <div key={day} className={`bg-white/80 p-1.5 text-center text-[10px] font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-500"}`}>
              {day}
            </div>
          ))}
          {calendarDays.map((day) => {
            const records = dayoffsByDate.get(day.date) || [];
            const dow = dayjs(day.date).day();
            const isToday = day.date === dayjs().format("YYYY-MM-DD");
            return (
              <div
                key={day.date}
                className={`min-h-[56px] bg-white/80 p-0.5 ${!day.isCurrentMonth ? "opacity-30" : ""} cursor-pointer active:bg-slate-50 transition-colors`}
                onClick={() => day.isCurrentMonth && handleOpenCreate(day.date)}
              >
                <div className={`text-[10px] font-medium px-0.5 ${isToday ? "bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center mx-auto" : dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-slate-600"}`}>
                  {day.dayOfMonth}
                </div>
                <div className="mt-0.5 space-y-px">
                  {records.slice(0, 2).map((r) => (
                    <div
                      key={r.id}
                      className={`truncate rounded px-0.5 text-[8px] leading-tight ${r.approver_id ? "bg-yellow-50 text-yellow-800" : "bg-green-50 text-green-800"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(r);
                      }}
                    >
                      {r.target?.full_name} {r.leave_type?.name}
                    </div>
                  ))}
                  {records.length > 2 && (
                    <div className="text-[8px] text-slate-400 text-center">+{records.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Add Button */}
      <Button
        className="w-full rounded-xl"
        onClick={() => handleOpenCreate()}
      >
        <Plus className="mr-2 h-4 w-4" />
        근태 등록
      </Button>

      {/* Records List */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">
          {month}월 근태 내역 ({dayoffs?.length || 0}건)
        </h2>
        {isLoading ? (
          <div className="text-center py-8 text-sm text-slate-400">로딩 중...</div>
        ) : dayoffs && dayoffs.length > 0 ? (
          dayoffs.map((record) => {
            const isApproved = !!record.approver_id;
            const category = record.leave_type?.category || "";
            const colorClass = LEAVE_TYPE_COLORS[category] || "bg-gray-50 text-gray-700 border-gray-200";
            let typeName = record.leave_type?.name || "";
            if (record.leave_type_id === 1 && record.late_hour) {
              typeName = `지각-${record.late_hour}시${record.late_minute || "00"}분`;
            }

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {dayjs(record.leave_date).format("MM/DD")}
                      <span className="text-xs text-slate-400 ml-0.5">
                        ({dayjs(record.leave_date).format("dd")})
                      </span>
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${colorClass}`}>
                      {typeName}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {isApproved ? (
                      <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[10px]">
                        <Lock className="h-2.5 w-2.5 mr-0.5" />
                        승인
                      </Badge>
                    ) : (
                      <>
                        <button
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-green-50 text-green-500"
                          onClick={() => approveMutation.mutate({ id: record.id, approverId: memberId })}
                          title="승인"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-slate-100 text-slate-400"
                          onClick={() => handleOpenEdit(record)}
                          title="수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-slate-100 text-slate-400"
                          onClick={() => handleCopy(record)}
                          title="복사"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-red-50 text-red-400"
                          onClick={() => handleDeleteClick(record)}
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>대상: {record.target?.full_name}</span>
                  <span>작성: {record.author?.full_name}</span>
                  {isApproved && <span>승인: {record.approver?.full_name}</span>}
                </div>
                {record.reason && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-2 py-1">
                    {record.reason}
                  </p>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-400">
            <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">등록된 근태가 없습니다.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "근태 수정" : "근태 등록"}</DialogTitle>
            <DialogDescription>
              {editingRecord ? "근태 정보를 수정합니다." : "주말/공휴일은 자동 제외됩니다."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">대상자</Label>
              <Select
                value={formData.targetId}
                onValueChange={(v) => setFormData({ ...formData, targetId: v })}
                disabled={!!editingRecord}
              >
                <SelectTrigger>
                  <SelectValue placeholder="대상자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(members || []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">시작일</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  disabled={!!editingRecord}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">종료일</Label>
                <Input
                  type="date"
                  value={formData.endDate || formData.startDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  disabled={!!editingRecord}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">구분</Label>
              <Select
                value={formData.leaveTypeId ? formData.leaveTypeId.toString() : ""}
                onValueChange={(v) => setFormData({ ...formData, leaveTypeId: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="근태 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(leaveTypes || []).map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.leaveTypeId === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">시</Label>
                  <Select value={formData.lateHour} onValueChange={(v) => setFormData({ ...formData, lateHour: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["09", "10", "11"].map((h) => (
                        <SelectItem key={h} value={h}>{h}시</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">분</Label>
                  <Select value={formData.lateMinute} onValueChange={(v) => setFormData({ ...formData, lateMinute: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((m) => (
                        <SelectItem key={m} value={m}>{m}분</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">사유</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="사유 입력 (선택)"
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>근태 삭제</AlertDialogTitle>
            <AlertDialogDescription>이 근태 기록을 삭제하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
