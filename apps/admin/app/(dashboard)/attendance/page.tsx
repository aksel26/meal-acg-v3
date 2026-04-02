"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react";
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

const ATTENDANCE_TYPES = [
  "출근",
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
  { value: "normal", label: "정상" },
  { value: "late", label: "지각" },
  { value: "early_leave", label: "조퇴" },
  { value: "absent", label: "결근" },
  { value: "pending", label: "미출근" },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
);

function formatTime(ts: string | null): string {
  if (!ts) return "";
  return dayjs(ts).format("HH:mm");
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
  const colCount = 16;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
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

        {viewMode === "date" && selectedDate === todayStr && summary && (
          <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
            <span>출근 <strong className="text-base text-green-600">{summary.checkedIn}</strong></span>
            <span>미출근 <strong className="text-base text-slate-700">{summary.notCheckedIn}</strong></span>
            <span>지각 <strong className="text-base text-red-600">{summary.late}</strong></span>
            <span>휴가 <strong className="text-base text-blue-600">{summary.onLeave}</strong></span>
            {summary.lateMembers.length > 0 && (
              <span className="text-red-500">
                지각: {summary.lateMembers.map((m) => m.name).join(", ")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-3 py-3">이름</th>
              <th className="px-3 py-3">수정자</th>
              <th className="px-3 py-3">근태명</th>
              <th className="px-3 py-3">날짜</th>
              <th className="px-3 py-3">출근시간</th>
              <th className="px-3 py-3">퇴근시간</th>
              <th className="px-3 py-3">연장시간</th>
              <th className="px-3 py-3">장소</th>
              <th className="px-3 py-3">참조</th>
              <th className="px-3 py-3">내용</th>
              <th className="px-3 py-3">승인자</th>
              <th className="px-3 py-3">등록일</th>
              <th className="px-3 py-3">수정일</th>
              <th className="px-3 py-3">승인일</th>
              <th className="px-3 py-3">로그인IP</th>
              <th className="px-3 py-3">로그인IP2</th>
              <th className="px-2 py-3 w-14"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={colCount + 1} className="py-10 text-center text-sm text-slate-400">
                  로딩 중...
                </td>
              </tr>
            ) : records && records.length > 0 ? (
              records.map((record, idx) => (
                <InlineRow
                  key={record.id || `${record.member_id}-${record.date}-${idx}`}
                  record={record}
                />
              ))
            ) : (
              <tr>
                <td colSpan={colCount + 1} className="py-12 text-center text-sm text-slate-400">
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

function InlineRow({ record }: { record: AttendanceRecord }) {
  const updateMutation = useUpdateAttendance();
  const [editing, setEditing] = useState(false);
  const [checkIn, setCheckIn] = useState(formatTime(record.check_in_at));
  const [checkOut, setCheckOut] = useState(formatTime(record.check_out_at));
  const [attendanceType, setAttendanceType] = useState(record.attendance_type || "출근");
  const [note, setNote] = useState(record.note ?? "");
  const [location, setLocation] = useState(record.location ?? "");
  const [reference, setReference] = useState(record.reference ?? "");

  const date = dayjs(record.date);

  const handleSave = async () => {
    const dateStr = record.date;
    const toIso = (time: string) => {
      if (!time) return null;
      return dayjs(`${dateStr}T${time}:00+09:00`).toISOString();
    };

    if (record.id) {
      updateMutation.mutate(
        {
          id: record.id,
          check_in_at: toIso(checkIn),
          check_out_at: toIso(checkOut),
          attendance_type: attendanceType,
          note: note || null,
          location: location || null,
          reference: reference || null,
        },
        { onSuccess: () => setEditing(false) }
      );
    } else {
      try {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: record.member_id,
            date: dateStr,
            check_in_at: toIso(checkIn),
            check_out_at: toIso(checkOut),
            attendance_type: attendanceType,
            status: "normal",
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
    setCheckIn(formatTime(record.check_in_at));
    setCheckOut(formatTime(record.check_out_at));
    setAttendanceType(record.attendance_type || "출근");
    setNote(record.note ?? "");
    setLocation(record.location ?? "");
    setReference(record.reference ?? "");
  };

  const cellClass = "px-3 py-2.5 text-slate-600";

  return (
    <tr className={cn("hover:bg-slate-50", editing && "bg-blue-50/30")}>
      {/* 이름 */}
      <td className="px-3 py-2.5 font-medium text-slate-800">
        {record.member.full_name}
      </td>
      {/* 수정자 */}
      <td className={cellClass}>
        {record.modifier?.full_name ?? "-"}
      </td>
      {/* 근태명 */}
      <td className={cellClass}>
        {editing ? (
          <Select value={attendanceType} onValueChange={setAttendanceType}>
            <SelectTrigger className="h-7 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATTENDANCE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs">{record.attendance_type || "출근"}</span>
        )}
      </td>
      {/* 날짜 */}
      <td className={cellClass}>
        {date.format("MM/DD")}
        <span className="ml-1 text-xs text-slate-400">
          ({["일","월","화","수","목","금","토"][date.day()]})
        </span>
      </td>
      {/* 출근시간 */}
      <td className={cellClass}>
        {editing ? (
          <Input
            type="time"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="h-7 w-[90px] text-xs"
          />
        ) : (
          formatTime(record.check_in_at) || "-"
        )}
      </td>
      {/* 퇴근시간 */}
      <td className={cellClass}>
        {editing ? (
          <Input
            type="time"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="h-7 w-[90px] text-xs"
          />
        ) : (
          formatTime(record.check_out_at) || "-"
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
      <td className={cellClass}>
        {record.approver?.full_name ?? "-"}
      </td>
      {/* 등록일 */}
      <td className={cellClass}>
        <span className="text-xs">{formatDateTime(record.created_at)}</span>
      </td>
      {/* 수정일 */}
      <td className={cellClass}>
        <span className="text-xs">{formatDateTime(record.updated_at)}</span>
      </td>
      {/* 승인일 */}
      <td className={cellClass}>
        <span className="text-xs">{formatDateTime(record.approved_at)}</span>
      </td>
      {/* 로그인IP */}
      <td className={cellClass}>
        <span className="text-xs font-mono">{record.login_ip || "-"}</span>
      </td>
      {/* 로그인IP2 */}
      <td className={cellClass}>
        <span className="text-xs font-mono">{record.login_ip2 || "-"}</span>
      </td>
      {/* Actions */}
      <td className="px-2 py-2.5">
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
              onClick={handleCancel}
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
