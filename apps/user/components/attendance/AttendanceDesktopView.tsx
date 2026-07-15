"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { ChevronRight, ExternalLink } from "lucide-react";
import MonthSelector from "./MonthSelector";
import AttendanceTable from "./AttendanceTable";
import AttendanceCalendar from "./AttendanceCalendar";
import type { DayoffRecord } from "@/hooks/use-dayoffs";
import type { LeaveBalance } from "@/hooks/use-leave-balances";
import type { ModifyRequest } from "@/hooks/use-attendance-modify";

dayjs.extend(utc);
dayjs.extend(timezone);

interface AttendanceRecord {
  id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_status: string | null;
  check_out_status: string | null;
  attendance_type: string;
  status: string;
  overtime_minutes: number;
  is_weekend: boolean;
  work_minutes: number;
  modification_status: string | null;
}

interface AttendanceSummary {
  total_work_days: number;
  total_work_minutes: number;
  total_overtime_minutes: number;
  early_check_in_count: number;
  late_count: number;
  early_leave_count: number;
}

interface AttendanceDesktopViewProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  records: AttendanceRecord[];
  dayoffs: DayoffRecord[];
  modifyRequests: ModifyRequest[];
  leaveBalances: LeaveBalance[];
  summary: AttendanceSummary | null;
  isLoading: boolean;
  onViewLeaveDetails: () => void;
  onManageDayoffs: (
    date: string,
    shouldCreate: boolean,
    record?: DayoffRecord,
  ) => void;
}

export default function AttendanceDesktopView({
  year,
  month,
  onMonthChange,
  selectedDate,
  onDateSelect,
  records,
  dayoffs,
  modifyRequests,
  leaveBalances,
  summary,
  isLoading,
  onViewLeaveDetails,
  onManageDayoffs,
}: AttendanceDesktopViewProps) {
  const [filterType, setFilterType] = useState("전체");

  const selectedRecord = useMemo(() => {
    if (!selectedDate) return null;
    return records.find((r) => r.date === selectedDate) ?? null;
  }, [records, selectedDate]);
  const selectedDayoffs = useMemo(() => {
    if (!selectedDate) return [];
    return dayoffs.filter((r) => r.leave_date === selectedDate);
  }, [dayoffs, selectedDate]);
  const remainingLeaveDays = useMemo(() => {
    return leaveBalances
      .filter(
        (balance) => balance.type === "annual" || balance.type === "monthly",
      )
      .reduce(
        (sum, balance) =>
          sum + balance.granted + balance.adjusted - balance.used,
        0,
      );
  }, [leaveBalances]);

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[460px_minmax(0,1fr)]">
      <div className="space-y-4">
        <MonthSelector
          year={year}
          month={month}
          onMonthChange={onMonthChange}
          className="border-0"
        />
        <AttendanceCalendar
          year={year}
          month={month}
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          records={records}
          dayoffs={dayoffs}
        />
      </div>

      <div className="min-w-0 space-y-4">
        {selectedDate && (
          <SelectedDaySummary
            selectedDate={selectedDate}
            record={selectedRecord}
            dayoffs={selectedDayoffs}
            onManageDayoffs={onManageDayoffs}
          />
        )}

        {summary && (
          <div className="mt-3 space-y-2 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#111111]">
                근태 요약
              </h2>
              <button
                type="button"
                onClick={onViewLeaveDetails}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                aria-label="휴가 자세히 보기"
                title="휴가 자세히 보기"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
            <div className="grid overflow-hidden rounded-xl bg-white sm:grid-cols-2 xl:grid-cols-7 xl:divide-x xl:divide-slate-100">
              {[
                { label: "근무일", value: `${summary.total_work_days}일` },
                {
                  label: "총 근무",
                  value: formatSummaryMinutes(summary.total_work_minutes),
                },
                {
                  label: "초과근무",
                  value: formatSummaryMinutes(summary.total_overtime_minutes),
                },
                {
                  label: "조기출근",
                  value: `${summary.early_check_in_count}회`,
                },
                { label: "지각", value: `${summary.late_count}회` },
                { label: "조퇴", value: `${summary.early_leave_count}회` },
                {
                  label: "남은 휴가",
                  value: formatLeaveDays(remainingLeaveDays),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex min-h-16 flex-col items-center justify-center text-center"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-base font-semibold text-[#111111]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          </div>
        ) : (
          <AttendanceTable
            records={records}
            modifyRequests={modifyRequests}
            selectedFilter={filterType}
            onFilterChange={setFilterType}
          />
        )}
      </div>
    </div>
  );
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "-";
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm:ss");
}

function formatCheckoutTime(isoString: string | null): string {
  if (!isoString) return "근무중";
  return formatTime(isoString);
}

function formatLeaveDays(days: number): string {
  if (!Number.isFinite(days)) return "-";
  return `${Number.isInteger(days) ? days : days.toFixed(1)}일`;
}

function formatSummaryMinutes(minutes: number): string {
  if (minutes <= 0) return "-";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return [
    hours > 0 ? `${hours}시간` : null,
    remainingMinutes > 0 ? `${remainingMinutes}분` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function SelectedDaySummary({
  selectedDate,
  record,
  dayoffs,
  onManageDayoffs,
}: {
  selectedDate: string;
  record: AttendanceRecord | null;
  dayoffs: DayoffRecord[];
  onManageDayoffs: (
    date: string,
    shouldCreate: boolean,
    record?: DayoffRecord,
  ) => void;
}) {
  const d = dayjs(selectedDate);

  return (
    <div className="rounded-xl bg-white">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#111111]">
          {d.format("M월 D일")} ({d.format("dd")})
        </p>
      </div>
      <div className="grid items-stretch gap-3 md:grid-cols-2">
        <div className="h-full">
          <div
            className={`grid h-full gap-2 ${record ? "grid-cols-2" : "grid-cols-1"}`}
          >
            <div className="flex h-full flex-col justify-center rounded-lg bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-400">출근시간</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {record ? formatTime(record.check_in_at) : "출근 전"}
              </p>
            </div>
            {record && (
              <div className="flex h-full flex-col justify-center rounded-lg bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-medium text-slate-400">
                  퇴근시간
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatCheckoutTime(record.check_out_at)}
                </p>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            onManageDayoffs(selectedDate, dayoffs.length === 0, dayoffs[0])
          }
          className="flex h-full w-full items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3 text-left transition-colors hover:bg-slate-100"
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium text-slate-400">
              휴가/연차
            </span>
            {dayoffs.length > 0 ? (
              <span className="mt-1 flex flex-wrap gap-1.5">
                {dayoffs.map((dayoff) => (
                  <span
                    key={dayoff.id}
                    className="rounded bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                  >
                    {dayoff.leave_type?.name || "휴가"}
                  </span>
                ))}
              </span>
            ) : (
              <span className="mt-1 block text-sm font-semibold text-slate-800">
                휴가 기록 없음
              </span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
