"use client";

import { useState, useMemo } from "react";
import MonthSelector from "./MonthSelector";
import AttendanceFilter from "./AttendanceFilter";
import AttendanceTable from "./AttendanceTable";

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
  records: AttendanceRecord[];
  summary: AttendanceSummary | null;
  isLoading: boolean;
  onRowClick: (record: AttendanceRecord) => void;
}

export default function AttendanceDesktopView({
  year,
  month,
  onMonthChange,
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <MonthSelector year={year} month={month} onMonthChange={onMonthChange} />
        <AttendanceFilter selected={filterType} onChange={setFilterType} />
      </div>

      {summary && (
        <div className="grid grid-cols-5 gap-3">
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
              className="card-premium rounded-xl p-4 text-center"
            >
              <p className="text-xs text-[oklch(0.55_0.01_250)] mb-1">
                {label}
              </p>
              <p className="text-lg font-semibold text-[oklch(0.25_0.02_250)]">
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
  );
}
