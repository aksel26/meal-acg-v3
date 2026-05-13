"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { cn } from "@repo/ui/lib/utils";
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
  CalendarOff,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  BarChart3,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import {
  useDayoffs,
  useLeaveTypes,
  useDayoffStats,
  type DayoffRecord,
  type LeaveType,
} from "@/hooks/useDayoffs";
import {
  useCreateDayoff,
  useUpdateDayoff,
  useDeleteDayoff,
  useApproveDayoff,
} from "@/hooks/useDayoffMutations";
import { useQuery } from "@tanstack/react-query";

dayjs.locale("ko");

const LEAVE_TYPE_COLORS: Record<string, string> = {
  "지각/조퇴": "bg-orange-50 text-orange-700 border-orange-200",
  반차: "bg-purple-50 text-purple-700 border-purple-200",
  연차: "bg-yellow-50 text-yellow-700 border-yellow-200",
  대체휴무: "bg-slate-100 text-slate-800 border-slate-300",
  경조휴무: "bg-pink-50 text-pink-700 border-pink-200",
  특별휴무: "bg-teal-50 text-teal-700 border-teal-200",
  훈련: "bg-slate-50 text-slate-700 border-slate-200",
  휴무: "bg-green-50 text-green-700 border-green-200",
};

interface MemberOption {
  id: string;
  full_name: string;
  team_name: string | null;
}

interface FormData {
  targetId: string;
  startDate: string;
  endDate: string;
  leaveTypeId: number;
  lateHour: string;
  lateMinute: string;
  ccMemberIds: string[];
  reason: string;
}

const defaultFormData: FormData = {
  targetId: "",
  startDate: "",
  endDate: "",
  leaveTypeId: 0,
  lateHour: "09",
  lateMinute: "00",
  ccMemberIds: [],
  reason: "",
};

export default function DayoffsPage() {
  const queryClient = useQueryClient();
  const currentYear = dayjs().year();
  const currentMonth = dayjs().month() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [viewMode, setViewMode] = useState<"calendar" | "table">("table");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DayoffRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);

  // Data fetching
  const { data: dayoffs, isLoading } = useDayoffs(year, month);
  const { data: leaveTypes } = useLeaveTypes();
  const { data: stats } = useDayoffStats(year, month);
  const { data: members } = useQuery<MemberOption[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  // Mutations
  const createMutation = useCreateDayoff();
  const updateMutation = useUpdateDayoff();
  const deleteMutation = useDeleteDayoff();
  const approveMutation = useApproveDayoff();

  // Calendar data
  const calendarDays = useMemo(() => {
    const start = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
    const daysInMonth = start.daysInMonth();
    const startDay = start.day(); // 0=Sun
    const days: { date: string; dayOfMonth: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = 0; i < startDay; i++) {
      const d = start.subtract(startDay - i, "day");
      days.push({ date: d.format("YYYY-MM-DD"), dayOfMonth: d.date(), isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = start.date(i);
      days.push({ date: d.format("YYYY-MM-DD"), dayOfMonth: i, isCurrentMonth: true });
    }
    // Next month padding to fill 6 rows
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

  // Handlers
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
      startDate: date || "",
      endDate: date || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (record: DayoffRecord) => {
    setEditingRecord(record);
    setFormData({
      targetId: record.target_id,
      startDate: record.leave_date,
      endDate: record.leave_date,
      leaveTypeId: record.leave_type_id,
      lateHour: record.late_hour || "09",
      lateMinute: record.late_minute || "00",
      ccMemberIds: record.cc_member_ids || [],
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
      ccMemberIds: record.cc_member_ids || [],
      reason: record.reason || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.targetId || !formData.startDate || !formData.leaveTypeId) {
      toast.error("대상자, 날짜, 휴가 유형을 입력해주세요.");
      return;
    }

    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        leaveDate: formData.startDate,
        leaveTypeId: formData.leaveTypeId,
        lateHour: formData.lateHour,
        lateMinute: formData.lateMinute,
        ccMemberIds: formData.ccMemberIds,
        reason: formData.reason,
      }, {
        onSuccess: () => setIsDialogOpen(false),
      });
    } else {
      createMutation.mutate({
        targetId: formData.targetId,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        leaveTypeId: formData.leaveTypeId,
        lateHour: formData.lateHour,
        lateMinute: formData.lateMinute,
        ccMemberIds: formData.ccMemberIds,
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

  const getLeaveTypeBadge = (record: DayoffRecord) => {
    const category = record.leave_type?.category || "";
    const colorClass = LEAVE_TYPE_COLORS[category] || "bg-gray-50 text-gray-700 border-gray-200";
    let label = record.leave_type?.name || "";
    if (record.leave_type_id === 1 && record.late_hour) {
      label = `지각-${record.late_hour}시${record.late_minute || "00"}분`;
    }
    return (
      <Badge variant="outline" className={`text-[11px] ${colorClass}`}>
        {label}
      </Badge>
    );
  };

  const getApprovalBadge = (record: DayoffRecord) => {
    if (record.approver_id) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[11px]">
          승인 ({record.approver?.full_name})
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px]">
        미승인
      </Badge>
    );
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const selectedLeaveType = leaveTypes?.find((t) => t.id === formData.leaveTypeId);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="h-9 w-24 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="h-9 w-20 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m.toString()}>{m}월</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsStatsOpen(true)}>
            <BarChart3 className="mr-2 h-4 w-4" />
            통계
          </Button>
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <button
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "table" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
              )}
              onClick={() => setViewMode("table")}
            >
              목록
            </button>
            <button
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "calendar" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
              )}
              onClick={() => setViewMode("calendar")}
            >
              캘린더
            </button>
          </div>
          <Button onClick={() => handleOpenCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            휴가 등록
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="rounded-xl border bg-white p-4">
            <div className="grid grid-cols-7 gap-px rounded-lg bg-slate-200 overflow-hidden">
              {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                <div key={day} className={`bg-slate-50 p-2 text-center text-xs font-semibold ${i === 0 ? "text-red-500" : i === 6 ? "text-slate-700" : "text-slate-600"}`}>
                  {day}
                </div>
              ))}
              {calendarDays.map((day) => {
                const records = dayoffsByDate.get(day.date) || [];
                const dow = dayjs(day.date).day();
                return (
                  <div
                    key={day.date}
                    className={`min-h-[100px] bg-white p-1 ${!day.isCurrentMonth ? "opacity-40" : ""} cursor-pointer hover:bg-slate-50 transition-colors`}
                    onClick={() => day.isCurrentMonth && handleOpenCreate(day.date)}
                  >
                    <div className={`text-xs font-medium mb-0.5 ${dow === 0 ? "text-red-500" : dow === 6 ? "text-slate-700" : "text-slate-700"}`}>
                      {day.dayOfMonth}
                    </div>
                    <div className="space-y-0.5">
                      {records.slice(0, 3).map((r) => (
                        <div
                          key={r.id}
                          className={`truncate rounded px-1 py-0.5 text-[10px] cursor-pointer ${r.approver_id ? "bg-yellow-50 text-yellow-800" : "bg-green-50 text-green-800"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(r);
                          }}
                          title={`${r.target?.full_name} ${r.leave_type?.name}`}
                        >
                          {r.approver_id
                            ? `[${r.leave_type?.name}] ${r.target?.full_name}`
                            : `[미승인] ${r.target?.full_name} ${r.leave_type?.name}`}
                        </div>
                      ))}
                      {records.length > 3 && (
                        <div className="text-[10px] text-slate-400 pl-1">+{records.length - 3}건</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">날짜</th>
                <th className="px-3 py-2">대상자</th>
                <th className="px-3 py-2">구분</th>
                <th className="px-3 py-2">사유</th>
                <th className="px-3 py-2">작성자</th>
                <th className="px-3 py-2">승인</th>
                <th className="px-3 py-2 w-28">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                    로딩 중...
                  </td>
                </tr>
              ) : dayoffs && dayoffs.length > 0 ? (
                dayoffs.map((record, index) => {
                  const date = dayjs(record.leave_date);
                  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.day()];
                  return (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 text-xs text-slate-400">{index + 1}</td>
                      <td className="px-3 py-1.5 text-slate-600">
                        {date.format("MM-DD")}
                        <span className={cn("ml-1 text-xs", date.day() === 0 ? "text-red-500" : date.day() === 6 ? "text-slate-700" : "text-slate-400")}>
                          ({dayOfWeek})
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">
                        <Link
                          href={`/dayoffs/${record.target_id}`}
                          className="text-slate-800 hover:text-slate-900 hover:underline"
                        >
                          {record.target?.full_name}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5">{getLeaveTypeBadge(record)}</td>
                      <td className="px-3 py-1.5 text-slate-600 max-w-[200px] truncate">
                        <span className="text-xs">{record.reason || "-"}</span>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-slate-400">
                        {record.author?.full_name}
                      </td>
                      <td className="px-3 py-1.5">{getApprovalBadge(record)}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex gap-0.5">
                          {!record.approver_id ? (
                            <button
                              className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-green-50 transition-colors text-green-500 hover:text-green-700"
                              onClick={() => approveMutation.mutate({ id: record.id, action: "approve" })}
                              title="승인"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          ) : (
                            <button
                              className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-amber-50 transition-colors text-amber-500 hover:text-amber-700"
                              onClick={() => approveMutation.mutate({ id: record.id, action: "cancel" })}
                              title="승인 취소"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
                            onClick={() => handleOpenEdit(record)}
                            title="수정"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
                            onClick={() => handleCopy(record)}
                            title="복사"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-red-50 transition-colors text-red-400 hover:text-red-600"
                            onClick={() => setDeleteTarget(record.id)}
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <CalendarOff className="h-8 w-8" />
                      <p className="text-sm">등록된 휴가가 없습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "휴가 수정" : "휴가 등록"}
            </DialogTitle>
            <DialogDescription>
              {editingRecord ? "휴가 정보를 수정합니다." : "휴가를 등록합니다. 주말/공휴일은 자동 제외됩니다."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Target Member */}
            <div className="space-y-2">
              <Label>대상자</Label>
              <Select
                value={formData.targetId}
                onValueChange={(v) => setFormData({ ...formData, targetId: v })}
                disabled={!!editingRecord}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="대상자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(members || []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name} {m.team_name ? `(${m.team_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  disabled={!!editingRecord}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={formData.endDate || formData.startDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  disabled={!!editingRecord}
                />
              </div>
            </div>

            {/* Leave Type */}
            <div className="space-y-2">
              <Label>구분</Label>
              <Select
                value={formData.leaveTypeId ? formData.leaveTypeId.toString() : ""}
                onValueChange={(v) => setFormData({ ...formData, leaveTypeId: parseInt(v) })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="휴가 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(leaveTypes || []).map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name} ({t.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Late Time (only for 지각) */}
            {formData.leaveTypeId === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>지각 시</Label>
                  <Select
                    value={formData.lateHour}
                    onValueChange={(v) => setFormData({ ...formData, lateHour: v })}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["09", "10", "11"].map((h) => (
                        <SelectItem key={h} value={h}>{h}시</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>지각 분</Label>
                  <Select
                    value={formData.lateMinute}
                    onValueChange={(v) => setFormData({ ...formData, lateMinute: v })}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((m) => (
                        <SelectItem key={m} value={m}>{m}분</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label>사유</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="사유를 입력하세요 (선택)"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? "저장 중..."
                : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>휴가 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 휴가 기록을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Dialog */}
      <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {year}년 {month}월 휴가 통계
            </DialogTitle>
            <DialogDescription>
              직원별 휴가 유형별 건수
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-3 py-2 sticky left-0 bg-slate-50">이름</th>
                  <th className="px-3 py-2">팀</th>
                  {(leaveTypes || []).map((t) => (
                    <th key={t.id} className="px-3 py-2 text-center w-12">
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats || []).map((s) => (
                  <tr key={s.member_id} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium text-slate-800 sticky left-0 bg-white">{s.member_name}</td>
                    <td className="px-3 py-1.5 text-xs text-slate-400">{s.team_name || "-"}</td>
                    {(leaveTypes || []).map((t) => {
                      const count = s.types[t.id] || 0;
                      return (
                        <td key={t.id} className={cn("px-3 py-1.5 text-center", count > 0 ? "text-red-600 font-semibold" : "text-slate-300")}>
                          {count || "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {(!stats || stats.length === 0) && (
                  <tr>
                    <td colSpan={(leaveTypes?.length || 0) + 2} className="text-center py-8 text-slate-400">
                      해당 월의 휴가 기록이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
