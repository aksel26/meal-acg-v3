"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import {
  useAttendanceByMonth,
  useAttendanceToday,
  useUpdateAttendance,
  type AttendanceRecord,
  type AttendanceTodaySummary,
} from "@/hooks/useAttendance";
import dayjs from "dayjs";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  normal: { label: "정상", className: "bg-green-100 text-green-700" },
  late: { label: "지각", className: "bg-red-100 text-red-700" },
  early_leave: { label: "조퇴", className: "bg-orange-100 text-orange-700" },
  pending: { label: "미출근", className: "bg-slate-100 text-slate-500" },
  absent: { label: "결근", className: "bg-red-100 text-red-700" },
};

function formatTime(ts: string | null): string {
  if (!ts) return "-";
  return dayjs(ts).format("HH:mm:ss");
}

function formatDuration(inAt: string | null, outAt: string | null): string {
  if (!inAt || !outAt) return "-";
  const diffMin = dayjs(outAt).diff(dayjs(inAt), "minute");
  if (diffMin <= 0) return "-";
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function toDatetimeLocal(ts: string | null): string {
  if (!ts) return "";
  return dayjs(ts).format("YYYY-MM-DDTHH:mm:ss");
}

interface EditForm {
  check_in_at: string;
  check_out_at: string;
  note: string;
}

export default function AttendancePage() {
  const today = dayjs();
  const [year, setYear] = useState(today.year());
  const [month, setMonth] = useState(today.month() + 1);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    check_in_at: "",
    check_out_at: "",
    note: "",
  });

  const { data: todaySummary } = useAttendanceToday();
  const { data: records, isLoading } = useAttendanceByMonth(year, month);
  const updateMutation = useUpdateAttendance();

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleOpenEdit = (record: AttendanceRecord) => {
    setEditRecord(record);
    setEditForm({
      check_in_at: toDatetimeLocal(record.check_in_at),
      check_out_at: toDatetimeLocal(record.check_out_at),
      note: record.note ?? "",
    });
  };

  const handleSave = () => {
    if (!editRecord) return;
    updateMutation.mutate(
      {
        id: editRecord.id,
        check_in_at: editForm.check_in_at
          ? dayjs(editForm.check_in_at).toISOString()
          : null,
        check_out_at: editForm.check_out_at
          ? dayjs(editForm.check_out_at).toISOString()
          : null,
        note: editForm.note || null,
      },
      {
        onSuccess: () => setEditRecord(null),
      },
    );
  };

  const summary = todaySummary as AttendanceTodaySummary | undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">출퇴근 현황</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[96px] text-center text-sm font-semibold text-slate-700">
            {year}년 {month}월
          </span>
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

      {/* Today Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border bg-green-50 p-4">
          <p className="text-xs font-medium text-green-600">출근</p>
          <p className="mt-1 text-3xl font-bold text-green-700">
            {summary?.checkedIn ?? "-"}
          </p>
          <p className="mt-0.5 text-xs text-green-500">명</p>
        </div>
        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">미출근</p>
          <p className="mt-1 text-3xl font-bold text-slate-700">
            {summary?.notCheckedIn ?? "-"}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">명</p>
        </div>
        <div className="rounded-xl border bg-red-50 p-4">
          <p className="text-xs font-medium text-red-500">지각</p>
          <p className="mt-1 text-3xl font-bold text-red-700">
            {summary?.late ?? "-"}
          </p>
          <p className="mt-0.5 text-xs text-red-400">명</p>
        </div>
        <div className="rounded-xl border bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-500">휴가</p>
          <p className="mt-1 text-3xl font-bold text-blue-700">
            {summary?.onLeave ?? "-"}
          </p>
          <p className="mt-0.5 text-xs text-blue-400">명</p>
        </div>
      </div>

      {/* Late / Not Checked In Tags */}
      {summary && (
        <div className="flex flex-wrap gap-4">
          {summary.lateMembers.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-red-500">지각:</span>
              {summary.lateMembers.map((m) => (
                <span
                  key={m.id}
                  className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600"
                >
                  {m.name}
                </span>
              ))}
            </div>
          )}
          {summary.notCheckedInMembers.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">미출근:</span>
              {summary.notCheckedInMembers.map((m) => (
                <span
                  key={m.id}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                >
                  {m.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">날짜</th>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">직급</th>
              <th className="px-4 py-3">출근</th>
              <th className="px-4 py-3">퇴근</th>
              <th className="px-4 py-3">근무시간</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">초과근무</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-10 text-center text-sm text-slate-400"
                >
                  로딩 중...
                </td>
              </tr>
            ) : records && records.length > 0 ? (
              records.map((record) => {
                const date = dayjs(record.date);
                const dow = DAY_NAMES[date.day()];
                const badge = STATUS_BADGE[record.status] ?? {
                  label: "미출근",
                  className: "bg-slate-100 text-slate-500",
                };
                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600">
                      {date.format("MM/DD")}
                      <span className="ml-1 text-xs text-slate-400">
                        ({dow})
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {record.member.full_name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {record.member.position?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatTime(record.check_in_at)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatTime(record.check_out_at)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatDuration(record.check_in_at, record.check_out_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {record.overtime_minutes > 0
                        ? `${record.overtime_minutes}분`
                        : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        onClick={() => handleOpenEdit(record)}
                        title="수정"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="py-12 text-center text-sm text-slate-400"
                >
                  출퇴근 기록이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>출퇴근 기록 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="check_in_at">출근시각</Label>
              <Input
                id="check_in_at"
                type="datetime-local"
                step="1"
                value={editForm.check_in_at}
                onChange={(e) =>
                  setEditForm({ ...editForm, check_in_at: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out_at">퇴근시각</Label>
              <Input
                id="check_out_at"
                type="datetime-local"
                step="1"
                value={editForm.check_out_at}
                onChange={(e) =>
                  setEditForm({ ...editForm, check_out_at: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">비고</Label>
              <Input
                id="note"
                type="text"
                value={editForm.note}
                onChange={(e) =>
                  setEditForm({ ...editForm, note: e.target.value })
                }
                placeholder="비고 입력 (선택)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
