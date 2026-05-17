"use client";

import { useState, useMemo } from "react";
import MonthSelector from "./MonthSelector";
import AttendanceFilter from "./AttendanceFilter";
import AttendanceTable from "./AttendanceTable";
import AttendanceCalendar from "./AttendanceCalendar";

interface AttendanceRecord {
  id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
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
  summary: AttendanceSummary | null;
  isLoading: boolean;
  onRowClick: (record: AttendanceRecord) => void;
}

export default function AttendanceDesktopView({
  year,
  month,
  onMonthChange,
  selectedDate,
  onDateSelect,
  records,
  summary,
  isLoading,
  onRowClick,
}: AttendanceDesktopViewProps) {
  const [filterType, setFilterType] = useState("전체");

  const filteredRecords = useMemo(() => {
    if (filterType === "전체") return records;
    return records.filter((r) => r.attendance_type === filterType);
  }, [records, filterType]);

  return (
    <div className="grid gap-4 lg:grid-cols-[4fr_6fr]">
      <div className="space-y-4">
        <MonthSelector
          year={year}
          month={month}
          onMonthChange={onMonthChange}
        />
        <AttendanceCalendar
          year={year}
          month={month}
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          records={records}
          defaultExpanded
        />
      </div>

      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-end">
          <AttendanceFilter selected={filterType} onChange={setFilterType} />
        </div>

        {summary && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "근무일", value: `${summary.total_work_days}일` },
              {
                label: "총 근무",
                value: `${Math.floor(summary.total_work_minutes / 60)}h`,
              },
              {
                label: "초과근무",
                value:
                  summary.total_overtime_minutes > 0
                    ? `${Math.floor(summary.total_overtime_minutes / 60)}h ${summary.total_overtime_minutes % 60}m`
                    : "-",
              },
              { label: "지각", value: `${summary.late_count}회` },
              { label: "조퇴", value: `${summary.early_leave_count}회` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-[#f3f3f3] bg-white px-4 py-4 text-center"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          </div>
        ) : (
          <AttendanceTable records={filteredRecords} onRowClick={onRowClick} />
        )}
      </div>
    </div>
  );
}
