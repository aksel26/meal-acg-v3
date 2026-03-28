"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useCostManagement } from "@/hooks/use-cost-management";
import { CostSummaryCards } from "./CostSummaryCards";
import { CostWorkerTable } from "./CostWorkerTable";
import { CostExportButton } from "./CostExportButton";
import { SettlementLockButton } from "@/components/common/SettlementLockButton";
import { useSettlementLock } from "@/hooks/use-settlement-lock";
import { AuditLogViewer } from "@/components/common/AuditLogViewer";

const MAIN_TABS = [
  { value: "cost", label: "비용 관리" },
  { value: "audit", label: "감사 로그" },
] as const;

export function CostManagementPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<"cost" | "audit">("cost");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading } = useCostManagement(year, month, debouncedSearch);
  const { data: settlementLock } = useSettlementLock("supervisor", year, month);
  const isLocked = settlementLock != null;

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
      {/* 메인 탭 */}
      <div className="flex gap-1 rounded-lg border bg-white p-1 w-fit">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "audit" && (
        <AuditLogViewer defaultTableName="work_records" />
      )}

      {activeTab === "cost" && (
      <>
      {/* 필터 + 엑셀 내보내기 (같은 행) */}
      <div className="flex items-center gap-4">
        <div className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3">
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
            className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SettlementLockButton type="supervisor" year={year} month={month} />
          <CostExportButton year={year} month={month} />
        </div>
      </div>

      {/* 요약 카드 */}
      {data && (
        <CostSummaryCards
          totalAmount={data.summary.totalAmount}
          totalWorkers={data.summary.totalWorkers}
          totalWorkHours={data.summary.totalWorkHours}
        />
      )}

      {/* 테이블 */}
      <CostWorkerTable
        workers={data?.workers ?? []}
        isLoading={isLoading}
        isLocked={isLocked}
      />
      </>
      )}
    </div>
  );
}
