"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import MonthSelector from "@/components/attendance/MonthSelector";
import DayoffsCalendar from "./DayoffsCalendar";
import DayoffsFilter from "./DayoffsFilter";
import DayoffsSummary from "./DayoffsSummary";
import DayoffsTable from "./DayoffsTable";
import type { DayoffRecord } from "./types";

interface DayoffsDesktopViewProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  records: DayoffRecord[];
  categories: string[];
  isLoading: boolean;
  onEdit: (record: DayoffRecord) => void;
  onDelete: (record: DayoffRecord) => void;
  onApprove: (record: DayoffRecord) => void;
  onCopy: (record: DayoffRecord) => void;
  onCreateNew: (date?: string) => void;
}

export default function DayoffsDesktopView({
  year,
  month,
  onMonthChange,
  selectedDate,
  onDateSelect,
  records,
  categories,
  isLoading,
  onEdit,
  onDelete,
  onApprove,
  onCopy,
  onCreateNew,
}: DayoffsDesktopViewProps) {
  const [filterType, setFilterType] = useState("전체");

  const filteredRecords = useMemo(() => {
    if (filterType === "전체") return records;
    return records.filter((r) => r.leave_type?.category === filterType);
  }, [records, filterType]);

  return (
    <div className="flex gap-6">
      <div className="w-3/10 shrink-0 space-y-4">
        <MonthSelector year={year} month={month} onMonthChange={onMonthChange} />
        <DayoffsCalendar
          year={year}
          month={month}
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          records={records}
          defaultExpanded
        />
        <Button
          className="w-full rounded-lg bg-[#131313] hover:bg-[#2a2a2a] text-white"
          onClick={() => onCreateNew()}
        >
          <Plus className="mr-2 h-4 w-4" />
          휴가 신청
        </Button>
      </div>

      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-end">
          <DayoffsFilter
            categories={categories}
            selected={filterType}
            onChange={setFilterType}
          />
        </div>

        <DayoffsSummary records={records} />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          </div>
        ) : (
          <DayoffsTable
            records={filteredRecords}
            onEdit={onEdit}
            onDelete={onDelete}
            onApprove={onApprove}
            onCopy={onCopy}
          />
        )}
      </div>
    </div>
  );
}
