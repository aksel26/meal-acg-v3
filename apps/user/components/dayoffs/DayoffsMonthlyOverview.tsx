"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import { CalendarDays } from "lucide-react";
import DayoffsFilter from "./DayoffsFilter";
import type { DayoffRecord, LeaveType } from "./types";
import type { LeaveBalance } from "@/hooks/use-leave-balances";
import { summarizeLeaveBalances } from "@/lib/leave-balance";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/src/tooltip";

interface DayoffsMonthlyOverviewProps {
  year: number;
  selectedMonth: number;
  records: DayoffRecord[];
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  hireDate: string | null;
  categories: string[];
  selectedCategory: string;
  isLoading: boolean;
  onCategoryChange: (category: string) => void;
  onMonthSelect: (month: number) => void;
}

type LeaveTypeRow = {
  id: number;
  label: string;
  category: string;
  sortOrder: number;
  monthlyTotals: number[];
  monthlyDates: string[][];
  total: number;
};

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function leaveAmount(record: DayoffRecord, leaveType?: LeaveType) {
  if (leaveType?.include_in_stats === false) return 0;

  const deductionAmount = Number(leaveType?.deduction_amount ?? 0);
  if (deductionAmount > 0) return deductionAmount;

  const durationType = leaveType?.duration_type || record.leave_type?.duration_type;
  if (durationType === "morning" || durationType === "afternoon") return 0.5;

  return 1;
}

function formatCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");
}

export default function DayoffsMonthlyOverview({
  year,
  selectedMonth,
  records,
  leaveTypes,
  leaveBalances,
  hireDate,
  categories,
  selectedCategory,
  isLoading,
  onCategoryChange,
  onMonthSelect,
}: DayoffsMonthlyOverviewProps) {
  const hireDateDayjs = hireDate ? dayjs(hireDate) : null;
  const workYear =
    hireDateDayjs && hireDateDayjs.isValid()
      ? Math.max(dayjs().diff(hireDateDayjs, "year") + 1, 1)
      : null;
  const { total: annualGranted, remaining: annualRemaining } =
    summarizeLeaveBalances(leaveBalances);

  const table = useMemo(() => {
    const leaveTypesById = new Map(leaveTypes.map((type) => [type.id, type]));
    const rowsByTypeId = new Map<number, LeaveTypeRow>();
    const monthlyTotals = Array.from({ length: 12 }, () => 0);

    records.forEach((record) => {
      const leaveType = leaveTypesById.get(record.leave_type_id);
      const amount = leaveAmount(record, leaveType);
      if (amount === 0) return;

      const monthIndex = dayjs(record.leave_date).month();
      if (monthIndex < 0 || monthIndex > 11) return;

      const row =
        rowsByTypeId.get(record.leave_type_id) ||
        {
          id: record.leave_type_id,
          label: leaveType?.name || record.leave_type?.name || "미지정",
          category: leaveType?.category || record.leave_type?.category || "-",
          sortOrder: leaveType?.sort_order ?? 999,
          monthlyTotals: Array.from({ length: 12 }, () => 0),
          monthlyDates: Array.from({ length: 12 }, () => []),
          total: 0,
        };

      row.monthlyTotals[monthIndex]! += amount;
      row.monthlyDates[monthIndex]!.push(record.leave_date);
      row.total += amount;
      monthlyTotals[monthIndex]! += amount;
      rowsByTypeId.set(record.leave_type_id, row);
    });

    const rows = Array.from(rowsByTypeId.values()).sort((a, b) => {
      const sortOrderDiff = a.sortOrder - b.sortOrder;
      if (sortOrderDiff !== 0) return sortOrderDiff;
      return a.label.localeCompare(b.label, "ko");
    });
    const grandTotal = monthlyTotals.reduce((sum, total) => sum + total, 0);

    return {
      rows,
      monthlyTotals,
      grandTotal,
    };
  }, [leaveTypes, records]);
  const specialLeave = useMemo(() => {
    const leaveTypesById = new Map(leaveTypes.map((type) => [type.id, type]));
    const items = records
      .filter((record) => {
        const leaveType = leaveTypesById.get(record.leave_type_id);
        const category = leaveType?.category || record.leave_type?.category || "";
        return category.includes("특별");
      })
      .map((record) => {
        const leaveType = leaveTypesById.get(record.leave_type_id);
        return {
          id: record.id,
          date: record.leave_date,
          amount: leaveAmount(record, leaveType),
          typeName: leaveType?.name || record.leave_type?.name || "특별휴가",
          reason: record.reason?.trim() || "내용 없음",
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const total = items.reduce((sum, item) => sum + item.amount, 0);

    return {
      items,
      total,
      deadline: `${year}-12-31`,
    };
  }, [leaveTypes, records, year]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#f3f3f3] bg-white px-4 py-5">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-44 animate-pulse rounded-lg bg-slate-50" />
      </div>
    );
  }

  return (
    <section className="bg-white py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[#111111]">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            월별 휴가 사용 내역
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {year}년 휴가 유형별 월 사용량과 합계를 표시합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            전체 합계 {formatCount(table.grandTotal)}개
          </div>
          <DayoffsFilter
            categories={categories}
            selected={selectedCategory}
            onChange={onCategoryChange}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryItem
          label="올해 부여 연차"
          value={`${formatCount(annualGranted)}일`}
        />
        <SummaryItem
          label="잔여 연차"
          value={`${formatCount(annualRemaining)}일`}
        />
        <SummaryItem
          label="근무 년차"
          value={workYear ? `${workYear}년차` : "-"}
        />
        <SummaryItem
          label="입사일"
          value={hireDateDayjs?.isValid() ? hireDateDayjs.format("YYYY-MM-DD") : "-"}
        />
        <SummaryItem
          label="특별휴가"
          value={`${formatCount(specialLeave.total)}일`}
          detail={`기한 ${specialLeave.deadline}`}
          title={specialLeave.items
            .map((item) => `${item.date} ${formatCount(item.amount)}일 ${item.reason}`)
            .join("\n")}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-[#f3f3f3]">
        <table className="w-full min-w-[720px] table-fixed text-left text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-[#f3f3f3]">
              <th className="w-32 px-3 py-2 text-xs font-medium text-slate-500">
                휴가 유형
              </th>
              {MONTHS.map((month) => (
                <th
                  key={month}
                  className="px-1 py-2 text-center text-xs font-medium text-slate-500"
                >
                  <button
                    type="button"
                    onClick={() => onMonthSelect(month)}
                    className={`h-7 min-w-8 rounded-md px-1 transition-colors ${
                      selectedMonth === month
                        ? "bg-[#111111] font-semibold text-white"
                        : "text-slate-500 hover:bg-white hover:text-[#111111]"
                    }`}
                  >
                    {month}월
                  </button>
                </th>
              ))}
              <th className="w-16 px-2 py-2 text-right text-xs font-medium text-slate-500">
                합계
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="px-3 py-10 text-center text-sm text-slate-400"
                >
                  표시할 휴가 사용 내역이 없습니다.
                </td>
              </tr>
            ) : (
              table.rows.map((row) => (
                <tr key={row.id} className="border-b border-[#f3f3f3]">
                  <th className="px-3 py-2 text-left">
                    <span className="block text-sm font-medium text-[#111111]">
                      {row.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                      {row.category}
                    </span>
                  </th>
                  {row.monthlyTotals.map((total, index) => (
                    <td
                      key={`${row.id}-${index}`}
                      className="px-1 py-2 text-center text-sm text-slate-600"
                    >
                      {total > 0 ? (
                        <MonthlyCellTooltip dates={row.monthlyDates[index] || []}>
                          {formatCount(total)}
                        </MonthlyCellTooltip>
                      ) : (
                        "-"
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right text-sm font-semibold text-[#111111]">
                    {formatCount(row.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-xs font-semibold text-slate-600">
                합계
              </th>
              {table.monthlyTotals.map((total, index) => (
                <td
                  key={index}
                  className="px-1 py-2 text-center text-xs font-semibold text-slate-700"
                >
                  {total > 0 ? formatCount(total) : "-"}
                </td>
              ))}
              <td className="px-2 py-2 text-right text-sm font-semibold text-[#111111]">
                {formatCount(table.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function SummaryItem({
  label,
  value,
  detail,
  title,
}: {
  label: string;
  value: string;
  detail?: string;
  title?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-3" title={title}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#111111]">{value}</p>
      {detail && <p className="mt-1 truncate text-[11px] text-slate-400">{detail}</p>}
    </div>
  );
}

function MonthlyCellTooltip({
  dates,
  children,
}: {
  dates: string[];
  children: string;
}) {
  const labels = [...dates]
    .sort()
    .map((date) => {
      const parsed = dayjs(date);
      return `${parsed.date()}일 (${WEEKDAY_LABELS[parsed.day()]})`;
    });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-md px-1.5 py-1 font-medium text-[#111111] underline-offset-2 hover:bg-slate-50 hover:underline"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-52">
        <div className="space-y-1 text-xs">
          {labels.map((label) => (
            <p key={label}>{label}</p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
