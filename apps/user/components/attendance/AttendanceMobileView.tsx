"use client";

import { useMemo } from "react";
import AttendanceCalendar from "./AttendanceCalendar";
import AttendanceCard from "./AttendanceCard";
import MonthSelector from "./MonthSelector";

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

interface AttendanceMobileViewProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  records: AttendanceRecord[];
  isLoading: boolean;
  onModifyRequest: (record: AttendanceRecord) => void;
}

export default function AttendanceMobileView({
  year,
  month,
  onMonthChange,
  selectedDate,
  onDateSelect,
  records,
  isLoading,
  onModifyRequest,
}: AttendanceMobileViewProps) {
  const selectedRecord = useMemo(() => {
    if (!selectedDate) return null;
    return records.find((r) => r.date === selectedDate) ?? null;
  }, [selectedDate, records]);

  return (
    <div className="space-y-4">
      <MonthSelector year={year} month={month} onMonthChange={onMonthChange} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        </div>
      ) : (
        <>
          <AttendanceCalendar
            year={year}
            month={month}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            records={records}
          />

          {selectedDate && (
            <AttendanceCard
              selectedDate={selectedDate}
              record={selectedRecord}
              onModifyRequest={() => {
                if (selectedRecord) onModifyRequest(selectedRecord);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
