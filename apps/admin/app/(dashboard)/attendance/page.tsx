"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { DatePicker } from "@repo/ui/src/date-picker";
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

const ATTENDANCE_TYPES = [
  "출근",
  "미출근",
  "연차",
  "오전반차",
  "오후반차",
  "외근",
  "출장",
  "재택근무",
  "병가",
  "경조사",
  "기타",
];

const STATUS_OPTIONS = [
  { value: "early_check_in", label: "조기출근" },
  { value: "normal", label: "정상" },
  { value: "late", label: "지각" },
  { value: "early_leave", label: "조퇴" },
  { value: "absent", label: "결근" },
  { value: "pending", label: "미출근" },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label]),
);

function formatTime(ts: string | null): string {
  if (!ts) return "";
  return dayjs(ts).format("HH:mm:ss");
}

function formatDateTime(ts: string | null): string {
  if (!ts) return "-";
  return dayjs(ts).format("MM/DD HH:mm");
}

function formatOvertimeMinutes(min: number): string {
  if (!min || min <= 0) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
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
    viewMode === "date" ? selectedDate : "",
  );
  const { data: monthRecords, isLoading: monthLoading } = useAttendanceByMonth(
    year,
    month,
  );

  const summary = todaySummary as AttendanceTodaySummary | undefined;
  const isLoading = viewMode === "date" ? dateLoading : monthLoading;
  const records = viewMode === "date" ? dateRecords : monthRecords;

  const handlePrevDay = () => {
    setSelectedDate(
      dayjs(selectedDate).subtract(1, "day").format("YYYY-MM-DD"),
    );
  };
  const handleNextDay = () => {
    setSelectedDate(dayjs(selectedDate).add(1, "day").format("YYYY-MM-DD"));
  };
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else setMonth(month - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else setMonth(month + 1);
  };

  const dow = dayjs(selectedDate).format("ddd");
  const colCount = 18;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("date")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "date"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              일별
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "month"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              월별
            </button>
          </div>

          {viewMode === "date" ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={handlePrevDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                className="h-9 w-[170px] text-sm"
              />
              <span className="text-xs text-slate-400">({dow})</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={handleNextDay}
              >
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
          )}
        </div>

        {viewMode === "date" && selectedDate === todayStr && summary && (
          <div className="ml-auto flex h-9 items-center divide-x divide-slate-200 text-sm font-medium text-slate-400">
            <span className="flex h-full items-center gap-1.5 px-3 first:pl-0">
              출근{" "}
              <strong className="inline-flex h-full items-center text-xl font-semibold leading-none text-slate-950">
                {summary.checkedIn}
              </strong>
            </span>
            <span className="flex h-full items-center gap-1.5 px-3">
              미출근{" "}
              <strong className="inline-flex h-full items-center text-xl font-semibold leading-none text-slate-950">
                {summary.notCheckedIn}
              </strong>
            </span>
            <span className="flex h-full items-center gap-1.5 px-3">
              조기출근{" "}
              <strong className="inline-flex h-full items-center text-xl font-semibold leading-none text-slate-600">
                {summary.earlyCheckIn}
              </strong>
            </span>
            <span className="flex h-full items-center gap-1.5 px-3">
              지각{" "}
              <strong className="inline-flex h-full items-center text-xl font-semibold leading-none text-slate-600">
                {summary.late}
              </strong>
            </span>
            <span className="flex h-full items-center gap-1.5 px-3">
              휴가{" "}
              <strong className="inline-flex h-full items-center text-xl font-semibold leading-none text-slate-950">
                {summary.onLeave}
              </strong>
            </span>
            {summary.lateMembers.length > 0 && (
              <span className="flex h-full items-center px-3 text-sm font-medium text-slate-500">
                지각: {summary.lateMembers.map((m) => m.name).join(", ")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-white">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <th className="w-12 px-3 py-2 text-center font-medium">No</th>
              <th className="px-3 py-2 font-medium">이름</th>
              <th className="px-3 py-2 font-medium">수정자</th>
              <th className="px-3 py-2 font-medium">근태명</th>
              <th className="px-3 py-2 font-medium">현황</th>
              <th className="px-3 py-2 font-medium">날짜</th>
              <th className="px-3 py-2 font-medium">출근시간</th>
              <th className="px-3 py-2 font-medium">퇴근시간</th>
              <th className="px-3 py-2 font-medium">연장시간</th>
              <th className="px-3 py-2 font-medium">장소</th>
              <th className="px-3 py-2 font-medium">참조</th>
              <th className="px-3 py-2 font-medium">내용</th>
              <th className="px-3 py-2 font-medium">승인자</th>
              <th className="px-3 py-2 font-medium">승인일</th>
              <th className="px-3 py-2 font-medium">수정일</th>
              <th className="px-3 py-2 font-medium">등록일</th>
              <th className="px-3 py-2 font-medium">로그인IP</th>
              <th className="px-3 py-2 font-medium">로그인IP2</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-3 py-10 text-center text-sm text-slate-500"
                >
                  로딩 중...
                </td>
              </tr>
            ) : records && records.length > 0 ? (
              records.map((record, idx) => (
                <InlineRow
                  key={record.id || `${record.member_id}-${record.date}-${idx}`}
                  record={record}
                  index={idx}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-3 py-10 text-center text-sm text-slate-500"
                >
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

type EditingField = "checkIn" | "checkOut" | null;

function TimeEditDropdown({
  label,
  value,
  onChange,
  onSave,
  onCancel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stableSave = useCallback(onSave, [onSave]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        stableSave();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [stableSave]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 z-50 rounded-md border bg-white p-3 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-500">{label}</label>
        <Input
          type="time"
          step={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          className="h-8 w-[150px] appearance-none bg-background text-xs [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          autoFocus
        />
      </div>
    </div>
  );
}

function InlineRow({
  record,
  index,
}: {
  record: AttendanceRecord;
  index: number;
}) {
  const updateMutation = useUpdateAttendance();
  const [editing, setEditing] = useState(false);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [checkIn, setCheckIn] = useState(formatTime(record.check_in_at));
  const [checkOut, setCheckOut] = useState(formatTime(record.check_out_at));
  const [attendanceType, setAttendanceType] = useState(
    record.attendance_type || "출근",
  );
  const [status, setStatus] = useState(record.status || "pending");
  const [note, setNote] = useState(record.note ?? "");
  const [location, setLocation] = useState(record.location ?? "");
  const [reference, setReference] = useState(record.reference ?? "");

  const date = dayjs(record.date);

  const toIso = (time: string) => {
    if (!time) return null;
    const normalizedTime = time.length === 5 ? `${time}:00` : time;
    return dayjs(`${record.date}T${normalizedTime}+09:00`).toISOString();
  };

  const saveField = async (field: "checkIn" | "checkOut", value: string) => {
    const payload: Record<string, unknown> = {};
    if (field === "checkIn") payload.check_in_at = toIso(value);
    if (field === "checkOut") payload.check_out_at = toIso(value);

    if (record.id) {
      updateMutation.mutate(
        { id: record.id, ...payload },
        { onSuccess: () => setEditingField(null) },
      );
    } else {
      try {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: record.member_id,
            date: record.date,
            check_in_at: field === "checkIn" ? toIso(value) : toIso(checkIn),
            check_out_at: field === "checkOut" ? toIso(value) : toIso(checkOut),
            attendance_type: attendanceType,
            status,
          }),
        });
        if (res.ok) {
          setEditingField(null);
          window.location.reload();
        }
      } catch {
        // error handled silently
      }
    }
  };

  const handleSave = async () => {
    if (record.id) {
      updateMutation.mutate(
        {
          id: record.id,
          check_in_at: toIso(checkIn),
          check_out_at: toIso(checkOut),
          attendance_type: attendanceType,
          status,
          note: note || null,
          location: location || null,
          reference: reference || null,
        },
        { onSuccess: () => setEditing(false) },
      );
    } else {
      try {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: record.member_id,
            date: record.date,
            check_in_at: toIso(checkIn),
            check_out_at: toIso(checkOut),
            attendance_type: attendanceType,
            status,
            note: note || null,
            location: location || null,
            reference: reference || null,
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

  const handleCancel = () => {
    setEditing(false);
    setEditingField(null);
    setCheckIn(formatTime(record.check_in_at));
    setCheckOut(formatTime(record.check_out_at));
    setAttendanceType(record.attendance_type || "출근");
    setStatus(record.status || "pending");
    setNote(record.note ?? "");
    setLocation(record.location ?? "");
    setReference(record.reference ?? "");
  };

  const handleTimeKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "checkIn" | "checkOut",
    value: string,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveField(field, value);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setEditingField(null);
      if (field === "checkIn") setCheckIn(formatTime(record.check_in_at));
      if (field === "checkOut") setCheckOut(formatTime(record.check_out_at));
    }
  };

  const cellClass = "px-3 py-3 align-middle text-slate-600";

  return (
    <tr
      className={cn(
        "border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50",
        editing && "bg-slate-100/30",
      )}
    >
      {/* No */}
      <td className="px-3 py-3 text-center align-middle text-xs tabular-nums text-slate-400">
        {index + 1}
      </td>
      {/* 이름 */}
      <td className="px-3 py-3 align-middle font-medium text-slate-800">
        {record.member.full_name}
      </td>
      {/* 수정자 */}
      <td className={cellClass}>{record.modifier?.full_name ?? "-"}</td>
      {/* 근태명 */}
      <td className={cellClass}>
        <Select
          value={attendanceType}
          onValueChange={(val) => {
            setAttendanceType(val);
            if (!editing) {
              if (record.id) {
                updateMutation.mutate({ id: record.id, attendance_type: val });
              }
            }
          }}
        >
          <SelectTrigger
            size="sm"
            className="!h-5 gap-1 border-0 bg-transparent px-0 py-0 text-xs leading-none shadow-none [&_svg]:size-3"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ATTENDANCE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      {/* 현황 */}
      <td className={cellClass}>
        <Select
          value={status}
          onValueChange={(val) => {
            setStatus(val);
            if (!editing && record.id) {
              updateMutation.mutate({ id: record.id, status: val });
            }
          }}
        >
          <SelectTrigger
            size="sm"
            className="!h-5 min-w-[76px] gap-1 border-0 bg-transparent px-0 py-0 text-xs leading-none shadow-none [&_svg]:size-3"
          >
            <SelectValue>{STATUS_LABEL[status] ?? status}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      {/* 날짜 */}
      <td className={cellClass}>
        {date.format("MM/DD")}
        <span className="ml-1 text-xs text-slate-400">
          ({["일", "월", "화", "수", "목", "금", "토"][date.day()]})
        </span>
      </td>
      {/* 출근시간 - 인라인 편집 */}
      <td className={cn(cellClass, "relative")}>
        {editing ? (
          <Input
            type="time"
            step={1}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="h-7 w-[110px] text-xs"
          />
        ) : (
          <>
            <button
              className="text-xs text-slate-600 hover:text-slate-800 hover:underline underline-offset-2 decoration-dashed"
              onClick={() => setEditingField("checkIn")}
            >
              {formatTime(record.check_in_at) || "-"}
            </button>
            {editingField === "checkIn" && (
              <TimeEditDropdown
                label="출근시간"
                value={checkIn}
                onChange={setCheckIn}
                onSave={() => {
                  const original = formatTime(record.check_in_at);
                  if (checkIn !== original) saveField("checkIn", checkIn);
                  else setEditingField(null);
                }}
                onCancel={() => {
                  setCheckIn(formatTime(record.check_in_at));
                  setEditingField(null);
                }}
              />
            )}
          </>
        )}
      </td>
      {/* 퇴근시간 - 인라인 편집 */}
      <td className={cn(cellClass, "relative")}>
        {editing ? (
          <Input
            type="time"
            step={1}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="h-7 w-[110px] text-xs"
          />
        ) : (
          <>
            <button
              className="text-xs text-slate-600 hover:text-slate-800 hover:underline underline-offset-2 decoration-dashed"
              onClick={() => setEditingField("checkOut")}
            >
              {formatTime(record.check_out_at) || "-"}
            </button>
            {editingField === "checkOut" && (
              <TimeEditDropdown
                label="퇴근시간"
                value={checkOut}
                onChange={setCheckOut}
                onSave={() => {
                  const original = formatTime(record.check_out_at);
                  if (checkOut !== original) saveField("checkOut", checkOut);
                  else setEditingField(null);
                }}
                onCancel={() => {
                  setCheckOut(formatTime(record.check_out_at));
                  setEditingField(null);
                }}
              />
            )}
          </>
        )}
      </td>
      {/* 연장시간 */}
      <td className={cellClass}>
        {formatOvertimeMinutes(record.overtime_minutes)}
      </td>
      {/* 장소 */}
      <td className={cellClass}>
        {editing ? (
          <Input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-7 w-[80px] text-xs"
            placeholder="장소"
          />
        ) : (
          <span className="text-xs">{record.location || "-"}</span>
        )}
      </td>
      {/* 참조 */}
      <td className={cellClass}>
        {editing ? (
          <Input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="h-7 w-[80px] text-xs"
            placeholder="참조"
          />
        ) : (
          <span className="text-xs">{record.reference || "-"}</span>
        )}
      </td>
      {/* 내용 */}
      <td className={cellClass}>
        {editing ? (
          <Input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-7 w-[100px] text-xs"
            placeholder="내용"
          />
        ) : (
          <span className="text-xs text-slate-400">{record.note || "-"}</span>
        )}
      </td>
      {/* 승인자 */}
      <td className={cellClass}>{record.approver?.full_name ?? "-"}</td>
      {/* 승인일 */}
      <td className={cellClass}>
        <span className="text-xs">{formatDateTime(record.approved_at)}</span>
      </td>
      {/* 수정일 */}
      <td className={cellClass}>
        <span className="text-xs">{formatDateTime(record.updated_at)}</span>
      </td>
      {/* 등록일 */}
      <td className={cellClass}>
        <span className="text-xs">{formatDateTime(record.created_at)}</span>
      </td>
      {/* 로그인IP */}
      <td className={cellClass}>
        <span className="text-xs font-mono">{record.login_ip || "-"}</span>
      </td>
      {/* 로그인IP2 */}
      <td className={cellClass}>
        <span className="text-xs font-mono">{record.login_ip2 || "-"}</span>
      </td>
    </tr>
  );
}
