"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import MonthSelector from "@/components/attendance/MonthSelector";
import DayoffsCalendar from "./DayoffsCalendar";
import DayoffsMonthlyOverview from "./DayoffsMonthlyOverview";
import DayoffsTable from "./DayoffsTable";
import type { DayoffRecord, LeaveType } from "./types";
import type { LeaveBalance } from "@/hooks/use-leave-balances";

interface DayoffsDesktopViewProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  records: DayoffRecord[];
  yearlyRecords: DayoffRecord[];
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  hireDate: string | null;
  categories: string[];
  isLoading: boolean;
  yearlyLoading: boolean;
  onEdit: (record: DayoffRecord) => void;
  onDelete: (record: DayoffRecord) => void;
  onCreateNew: (date?: string) => void;
}

export default function DayoffsDesktopView({
  year,
  month,
  onMonthChange,
  selectedDate,
  onDateSelect,
  records,
  yearlyRecords,
  leaveTypes,
  leaveBalances,
  hireDate,
  categories,
  isLoading,
  yearlyLoading,
  onEdit,
  onDelete,
  onCreateNew,
}: DayoffsDesktopViewProps) {
  const [filterType, setFilterType] = useState("전체");

  const filteredRecords = useMemo(() => {
    if (filterType === "전체") return records;
    return records.filter((r) => r.leave_type?.category === filterType);
  }, [records, filterType]);

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-4">
        <MonthSelector
          year={year}
          month={month}
          onMonthChange={onMonthChange}
          className="border-0"
        />
        <DayoffsCalendar
          year={year}
          month={month}
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          records={records}
          defaultExpanded
        />
        <Button
          className="h-10 w-full rounded-lg bg-[#111111] text-sm font-medium text-white hover:bg-[#222222]"
          onClick={() => onCreateNew()}
        >
          <Plus className="mr-2 h-4 w-4" />
          휴가 신청
        </Button>

        {isLoading ? (
          <div className="flex items-center justify-center bg-slate-50 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          </div>
        ) : (
          <DayoffsTable
            records={filteredRecords}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </div>

      <div className="min-w-0 space-y-4">
        <DayoffsMonthlyOverview
          year={year}
          selectedMonth={month}
          records={yearlyRecords}
          leaveTypes={leaveTypes}
          leaveBalances={leaveBalances}
          hireDate={hireDate}
          categories={categories}
          selectedCategory={filterType}
          isLoading={yearlyLoading}
          onCategoryChange={setFilterType}
          onMonthSelect={(nextMonth) => onMonthChange(year, nextMonth)}
        />

      </div>
    </div>
  );
}
