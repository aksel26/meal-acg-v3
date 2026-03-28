"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useInterviewSettlement } from "@/hooks/use-interview-settlement";
import { formatCurrency } from "@/lib/cost-utils";
import { SettlementTable } from "./SettlementTable";
import { SettlementExportButton } from "./SettlementExportButton";
import { SettlementLockButton } from "@/components/common/SettlementLockButton";
import { useSettlementLock } from "@/hooks/use-settlement-lock";
import { AuditLogViewer } from "@/components/common/AuditLogViewer";

const MAIN_TABS = [
  { value: "settlement", label: "정산" },
  { value: "audit", label: "감사 로그" },
] as const;

const ROLE_TABS = [
  { value: "", label: "전체" },
  { value: "rp", label: "RP" },
  { value: "ft", label: "FT" },
  { value: "instructor", label: "강사" },
] as const;

export function SettlementPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<"settlement" | "audit">("settlement");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleMonthChange = (direction: -1 | 1) => {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setYear(newYear);
    setMonth(newMonth);
  };

  const { data, isLoading } = useInterviewSettlement(
    year,
    month,
    roleFilter || undefined,
    debouncedSearch || undefined,
  );
  const { data: settlementLock } = useSettlementLock("interview", year, month);
  const isLocked = settlementLock != null;

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
        <AuditLogViewer defaultTableName="interview_work_records" />
      )}

      {activeTab === "settlement" && (
      <>
      {/* 필터 행 */}
      <div className="flex items-center gap-3">
        {/* 월 내비게이션 */}
        <div className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3">
          <button
            onClick={() => handleMonthChange(-1)}
            className="text-slate-400 hover:text-slate-600"
          >
            &larr;
          </button>
          <span className="min-w-[100px] text-center font-medium text-slate-900">
            {year}년 {month}월
          </span>
          <button
            onClick={() => handleMonthChange(1)}
            className="text-slate-400 hover:text-slate-600"
          >
            &rarr;
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SettlementLockButton type="interview" year={year} month={month} />
          <SettlementExportButton year={year} month={month} />
        </div>
      </div>

      {/* 요약 카드 */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-md bg-white p-5">
            <p className="text-sm text-slate-500">총 인건비</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatCurrency(data.summary.totalAmount)}
            </p>
          </div>
          <div className="rounded-md bg-white p-5">
            <p className="text-sm text-slate-500">인력 수</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {data.summary.totalWorkers}명
            </p>
          </div>
          <div className="rounded-md bg-white p-5">
            <p className="text-sm text-slate-500">총 근무시간</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {data.summary.totalWorkHours}h
            </p>
          </div>
        </div>
      )}

      {/* 역할 필터 탭 + 검색 */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 rounded-lg border bg-white p-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                roleFilter === tab.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* 테이블 */}
      <SettlementTable
        personnel={data?.personnel ?? []}
        isLoading={isLoading}
        isLocked={isLocked}
      />
      </>
      )}

    </div>
  );
}
