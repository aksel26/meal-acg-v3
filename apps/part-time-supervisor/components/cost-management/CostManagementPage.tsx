"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useCostManagement } from "@/hooks/use-cost-management";
import { CostSummaryCards } from "./CostSummaryCards";
import { CostWorkerTable } from "./CostWorkerTable";
import { CostExportButton } from "./CostExportButton";

export function CostManagementPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading } = useCostManagement(year, month, debouncedSearch);

  // 검색 디바운스 — useEffect로 타이머 정리
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 월 변경
  const handleMonthChange = (direction: -1 | 1) => {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setYear(newYear);
    setMonth(newMonth);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">비용 관리</h1>
        <CostExportButton year={year} month={month} />
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
          <button onClick={() => handleMonthChange(-1)} className="text-slate-400 hover:text-slate-600">
            &larr;
          </button>
          <span className="min-w-[100px] text-center font-medium text-slate-900">
            {year}년 {month}월
          </span>
          <button onClick={() => handleMonthChange(1)} className="text-slate-400 hover:text-slate-600">
            &rarr;
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="지원자 이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* 요약 카드 */}
      {data && (
        <CostSummaryCards
          totalAmount={data.summary.totalAmount}
          totalWorkers={data.summary.totalWorkers}
          totalWorkHours={data.summary.totalWorkHours}
          totalWorkDays={data.summary.totalWorkDays}
        />
      )}

      {/* 테이블 */}
      <CostWorkerTable
        workers={data?.workers ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
