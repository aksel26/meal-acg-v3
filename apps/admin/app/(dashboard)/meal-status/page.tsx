"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ChevronDown } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import { queryKeys } from "@/lib/query-keys";
import MembersTab from "./MembersTab";
import StatusTab from "./StatusTab";

const YEARS_RANGE = 5;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const TABS = [
  { key: "status", label: "현황" },
  { key: "members", label: "인원별" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface MemberOption {
  id: string;
  full_name: string;
}

export default function MealStatusPage() {
  return (
    <Suspense>
      <MealStatusPageContent />
    </Suspense>
  );
}

function MealStatusPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDate = dayjs();

  // URL 쿼리 파라미터 (없으면 현재 날짜 / 기본 탭 현황)
  const selectedYear = parseInt(
    searchParams.get("year") || String(currentDate.year()),
  );
  const selectedMonth = parseInt(
    searchParams.get("month") || String(currentDate.month() + 1),
  );
  const tab: TabKey =
    searchParams.get("tab") === "members" ? "members" : "status";

  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);

  // 인원 검색 (두 탭 공유)
  const [selectedUserId, setSelectedUserId] = useState("");
  const { data: members } = useQuery<MemberOption[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // URL 쿼리 파라미터 업데이트 (year/month/tab 공용)
  const updateUrlParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        params.set(key, value);
      });
      router.replace(`/meal-status?${params.toString()}`);
    },
    [router, searchParams],
  );

  const years = useMemo(
    () =>
      Array.from({ length: YEARS_RANGE }, (_, i) => currentDate.year() - 2 + i),
    [currentDate],
  );

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-6">
      {/* Segment + Year/Month */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Segment Control */}
        <div className="inline-flex items-center rounded-lg bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => updateUrlParams({ tab: t.key })}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                tab === t.key
                  ? "bg-white text-[#135bec] shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Year Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsYearOpen(!isYearOpen);
              setIsMonthOpen(false);
            }}
            className="flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200/60 transition-all hover:bg-slate-50"
          >
            {selectedYear}년
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                isYearOpen && "rotate-180",
              )}
            />
          </button>
          {isYearOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-32 rounded-md bg-white p-1 shadow-lg ring-1 ring-slate-200/60">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    updateUrlParams({ year: String(year) });
                    setIsYearOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
                    year === selectedYear
                      ? "bg-[#135bec]/10 font-medium text-[#135bec]"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {year}년
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Month Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsMonthOpen(!isMonthOpen);
              setIsYearOpen(false);
            }}
            className="flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200/60 transition-all hover:bg-slate-50"
          >
            {selectedMonth}월
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                isMonthOpen && "rotate-180",
              )}
            />
          </button>
          {isMonthOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 grid w-48 grid-cols-4 gap-1 rounded-md bg-white p-2 shadow-lg ring-1 ring-slate-200/60">
              {MONTHS.map((month) => (
                <button
                  key={month}
                  onClick={() => {
                    updateUrlParams({ month: String(month) });
                    setIsMonthOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-center rounded-md py-2 text-sm transition-colors",
                    month === selectedMonth
                      ? "bg-[#135bec]/10 font-medium text-[#135bec]"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {month}월
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Search (shared) */}
        <div className="ml-auto">
          <SearchableDropdown<MemberOption>
            items={members ?? []}
            value={selectedUserId}
            getItemKey={(m) => m.id}
            getItemLabel={(m) => m.full_name}
            onSelect={(m) => setSelectedUserId(m.id)}
            onClear={() => setSelectedUserId("")}
            placeholder="사용자 선택..."
            searchPlaceholder="이름 또는 초성 검색..."
            emptyText="검색 결과가 없습니다"
            allowClear
            className="h-9"
          />
        </div>
      </div>

      {/* Tab Content */}
      {tab === "status" ? (
        <StatusTab
          year={selectedYear}
          month={selectedMonth}
          selectedUserId={selectedUserId}
        />
      ) : (
        <MembersTab
          year={selectedYear}
          month={selectedMonth}
          selectedUserId={selectedUserId}
        />
      )}

      {/* Click outside to close dropdowns */}
      {(isYearOpen || isMonthOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsYearOpen(false);
            setIsMonthOpen(false);
          }}
        />
      )}
    </div>
  );
}
