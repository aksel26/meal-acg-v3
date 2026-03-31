"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Save, Loader2 } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  useAttendanceByDate,
  useAttendanceByMonth,
  useAttendanceToday,
  useUpdateAttendance,
  type AttendanceRecord,
  type AttendanceTodaySummary,
} from "@/hooks/useAttendance";
import dayjs from "dayjs";
import { cn } from "@repo/ui/lib/utils";

const STATUS_OPTIONS = [
  { value: "normal", label: "정상", className: "bg-green-100 text-green-700" },
  { value: "late", label: "지각", className: "bg-red-100 text-red-700" },
  { value: "early_leave", label: "조퇴", className: "bg-orange-100 text-orange-700" },
  { value: "absent", label: "결근", className: "bg-red-100 text-red-700" },
  { value: "pending", label: "미출근", className: "bg-slate-100 text-slate-500" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, { label: s.label, className: s.className }])
);

function formatTime(ts: string | null): string {
  if (!ts) return "";
  return dayjs(ts).format("HH:mm");
}

function formatDuration(inAt: string | null, outAt: string | null): string {
  if (!inAt || !outAt) return "-";
  const diffMin = dayjs(outAt).diff(dayjs(inAt), "minute");
  if (diffMin <= 0) return "-";
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type ViewMode = "date" | "month";

export default function AttendancePage() {
  const todayStr = dayjs().format("YYYY-MM-DD");
  const [viewMode, setViewMode] = useState<ViewMode>("date");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);

  const { data: todaySummary } = useAttendanceToday();
  const { data: dateRecords, isLoading: dateLoading } = useAttendanceByDate(
    viewMode === "date" ? selectedDate : ""
  );
  const { data: monthRecords, isLoading: monthLoading } = useAttendanceByMonth(
    year,
    month
  );

  const summary = todaySummary as AttendanceTodaySummary | undefined;
  const isLoading = viewMode === "date" ? dateLoading : monthLoading;
  const records = viewMode === "date" ? dateRecords : monthRecords;

  const handlePrevDay = () => {
    setSelectedDate(dayjs(selectedDate).subtract(1, "day").format("YYYY-MM-DD"));
  };
  const handleNextDay = () => {
    setSelectedDate(dayjs(selectedDate).add(1, "day").format("YYYY-MM-DD"));
  };
  const handlePrevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  const dow = dayjs(selectedDate).format("ddd");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">출퇴근 현황</h1>
        <div className="flex items-center gap-2">
          {/* 뷰 모드 토글 */}
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <button
              onClick={() => setViewMode("date")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "date" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
              )}
            >
              일별
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "month" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
              )}
            >
              월별
            </button>
          </div>

          {viewMode === "date" ? (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 w-[150px] text-sm"
              />
              <span className="text-xs text-slate-400">({dow})</span>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={() => setSelectedDate(todayStr)}
              >
                오늘
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[96px] text-center text-sm font-semibold text-slate-700">
                {year}년 {month}월
              </span>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Today Summary Cards (only in date mode when viewing today) */}
      {viewMode === "date" && selectedDate === todayStr && summary && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-xl border bg-green-50 p-4">
              <p className="text-xs font-medium text-green-600">출근</p>
              <p className="mt-1 text-3xl font-bold text-green-700">{summary.checkedIn}</p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">미출근</p>
              <p className="mt-1 text-3xl font-bold text-slate-700">{summary.notCheckedIn}</p>
            </div>
            <div className="rounded-xl border bg-red-50 p-4">
              <p className="text-xs font-medium text-red-500">지각</p>
              <p className="mt-1 text-3xl font-bold text-red-700">{summary.late}</p>
            </div>
            <div className="rounded-xl border bg-blue-50 p-4">
              <p className="text-xs font-medium text-blue-500">휴가</p>
              <p className="mt-1 text-3xl font-bold text-blue-700">{summary.onLeave}</p>
            </div>
          </div>
          {summary.lateMembers.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-red-500">지각:</span>
              {summary.lateMembers.map((m) => (
                <span key={m.id} className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                  {m.name}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              {viewMode === "month" && <th className="px-4 py-3">날짜</th>}
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">직급</th>
              <th className="px-4 py-3">출근여부</th>
              <th className="px-4 py-3">출근</th>
              <th className="px-4 py-3">퇴근</th>
              <th className="px-4 py-3">근무시간</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">초과근무</th>
              <th className="px-4 py-3">비고</th>
              <th className="px-3 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={viewMode === "month" ? 11 : 10} className="py-10 text-center text-sm text-slate-400">
                  로딩 중...
                </td>
              </tr>
            ) : records && records.length > 0 ? (
              records.map((record, idx) => (
                <InlineRow
                  key={record.id || `${record.member_id}-${record.date}-${idx}`}
                  record={record}
                  showDate={viewMode === "month"}
                />
              ))
            ) : (
              <tr>
                <td colSpan={viewMode === "month" ? 11 : 10} className="py-12 text-center text-sm text-slate-400">
                  출퇴근 기록이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InlineRow({
  record,
  showDate,
}: {
  record: AttendanceRecord;
  showDate: boolean;
}) {
  const updateMutation = useUpdateAttendance();
  const [editing, setEditing] = useState(false);
  const [checkIn, setCheckIn] = useState(formatTime(record.check_in_at));
  const [checkOut, setCheckOut] = useState(formatTime(record.check_out_at));
  const [status, setStatus] = useState(record.status);
  const [note, setNote] = useState(record.note ?? "");

  const hasCheckedIn = !!record.check_in_at;
  const badge = STATUS_BADGE[record.status] ?? STATUS_BADGE["pending"]!;
  const date = dayjs(record.date);

  const handleSave = async () => {
    const dateStr = record.date;
    const toIso = (time: string) => {
      if (!time) return null;
      return dayjs(`${dateStr}T${time}:00+09:00`).toISOString();
    };

    if (record.id) {
      // 기존 레코드 수정
      updateMutation.mutate(
        {
          id: record.id,
          check_in_at: toIso(checkIn),
          check_out_at: toIso(checkOut),
          status,
          note: note || null,
        },
        { onSuccess: () => setEditing(false) }
      );
    } else {
      // 신규 레코드 생성 (upsert)
      try {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: record.member_id,
            date: dateStr,
            check_in_at: toIso(checkIn),
            check_out_at: toIso(checkOut),
            status,
            note: note || null,
          }),
        });
        if (res.ok) {
          setEditing(false);
          window.location.reload();
        }
      } catch {
        // error handled silently
      }
    }
  };

  return (
    <tr className={cn("hover:bg-slate-50", editing && "bg-blue-50/30")}>
      {showDate && (
        <td className="px-4 py-2.5 text-slate-600">
          {date.format("MM/DD")}
          <span className="ml-1 text-xs text-slate-400">
            ({["일","월","화","수","목","금","토"][date.day()]})
          </span>
        </td>
      )}
      <td className="px-4 py-2.5 font-medium text-slate-800">
        {record.member.full_name}
      </td>
      <td className="px-4 py-2.5 text-slate-500 text-xs">
        {record.member.position?.name ?? "-"}
      </td>
      <td className="px-4 py-2.5">
        {hasCheckedIn ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <Check className="h-3 w-3" />
            출근
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            미출근
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {editing ? (
          <Input
            type="time"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="h-7 w-[100px] text-xs"
          />
        ) : (
          <span className="text-slate-600">{formatTime(record.check_in_at) || "-"}</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {editing ? (
          <Input
            type="time"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="h-7 w-[100px] text-xs"
          />
        ) : (
          <span className="text-slate-600">{formatTime(record.check_out_at) || "-"}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-slate-600">
        {formatDuration(record.check_in_at, record.check_out_at)}
      </td>
      <td className="px-4 py-2.5">
        {editing ? (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-7 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-slate-500">
        {record.overtime_minutes > 0 ? `${record.overtime_minutes}분` : "-"}
      </td>
      <td className="px-4 py-2.5">
        {editing ? (
          <Input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-7 w-[120px] text-xs"
            placeholder="비고"
          />
        ) : (
          <span className="text-xs text-slate-400">{record.note || ""}</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {editing ? (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 text-blue-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-xs text-slate-400"
              onClick={() => {
                setEditing(false);
                setCheckIn(formatTime(record.check_in_at));
                setCheckOut(formatTime(record.check_out_at));
                setStatus(record.status);
                setNote(record.note ?? "");
              }}
            >
              ✕
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 hover:text-slate-600"
            onClick={() => setEditing(true)}
          >
            수정
          </Button>
        )}
      </td>
    </tr>
  );
}
