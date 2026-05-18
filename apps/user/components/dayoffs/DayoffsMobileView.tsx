"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import MonthSelector from "@/components/attendance/MonthSelector";
import DayoffsCalendar from "./DayoffsCalendar";
import DayoffCard from "./DayoffCard";
import type { DayoffRecord } from "./types";

interface DayoffsMobileViewProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  records: DayoffRecord[];
  isLoading: boolean;
  onEdit: (record: DayoffRecord) => void;
  onDelete: (record: DayoffRecord) => void;
  onCopy: (record: DayoffRecord) => void;
  onCreateNew: (date?: string) => void;
}

export default function DayoffsMobileView({
  year,
  month,
  onMonthChange,
  selectedDate,
  onDateSelect,
  records,
  isLoading,
  onEdit,
  onDelete,
  onCopy,
  onCreateNew,
}: DayoffsMobileViewProps) {
  const selectedRecords = useMemo(() => {
    if (!selectedDate) return [];
    return records.filter((r) => r.leave_date === selectedDate);
  }, [selectedDate, records]);

  return (
    <div className="space-y-4">
      <MonthSelector
        year={year}
        month={month}
        onMonthChange={onMonthChange}
        className="border-0"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        </div>
      ) : (
        <>
          <DayoffsCalendar
            year={year}
            month={month}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            records={records}
          />

          {selectedDate && (
            <DayoffCard
              selectedDate={selectedDate}
              records={selectedRecords}
              onEdit={onEdit}
              onDelete={onDelete}
              onCopy={onCopy}
              onCreateNew={onCreateNew}
            />
          )}
        </>
      )}

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onCreateNew(selectedDate || undefined)}
        className="fixed bottom-20 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#111111] text-white shadow-lg transition-colors hover:bg-[#222222]"
        aria-label="휴가 신청"
      >
        <Plus className="h-5 w-5" />
      </motion.button>
    </div>
  );
}
