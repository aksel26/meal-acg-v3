"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { ArrowDown, ArrowUp, ClipboardList } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { useMealLogs, type MealLogWithMember } from "@/hooks/useMealLogs";

interface MealEntry {
  key: string;
  userId: string;
  fullName: string;
  date: string;
  meal: "아침" | "점심" | "저녁";
  store: string;
  amount: number;
  payer: string;
}

const MEAL_ORDER: Record<MealEntry["meal"], number> = {
  아침: 0,
  점심: 1,
  저녁: 2,
};

const mealBadgeStyle = (meal: MealEntry["meal"]) => {
  switch (meal) {
    case "아침":
      return "bg-amber-50 text-amber-600";
    case "점심":
      return "bg-sky-50 text-sky-600";
    default:
      return "bg-indigo-50 text-indigo-600";
  }
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ko-KR").format(amount);

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const formatEntryDate = (date: string) => {
  const d = dayjs(date);
  return `${d.format("MM.DD")} (${WEEKDAYS[d.day()]})`;
};

// meal_logs를 끼니별로 펼치되 금액이 있는 끼니만 추출
function flattenMealEntries(logs: MealLogWithMember[]): MealEntry[] {
  const rows: MealEntry[] = [];

  for (const log of logs) {
    const fullName = log.members?.full_name || log.user_id;
    const meals: {
      meal: MealEntry["meal"];
      store: string | null;
      amount: number | null;
      payer: string | null;
    }[] = [
      {
        meal: "아침",
        store: log.breakfast_store,
        amount: log.breakfast_amount,
        payer: log.breakfast_payer,
      },
      {
        meal: "점심",
        store: log.lunch_store,
        amount: log.lunch_amount,
        payer: log.lunch_payer,
      },
      {
        meal: "저녁",
        store: log.dinner_store,
        amount: log.dinner_amount,
        payer: log.dinner_payer,
      },
    ];

    for (const m of meals) {
      if (!m.amount || m.amount <= 0) continue;
      rows.push({
        key: `${log.id}-${m.meal}`,
        userId: log.user_id,
        fullName,
        date: log.entry_date,
        meal: m.meal,
        store: m.store?.trim() || "-",
        amount: m.amount,
        payer: m.payer?.trim() || "-",
      });
    }
  }

  return rows;
}

export default function StatusTab({
  year,
  month,
  selectedUserId,
}: {
  year: number;
  month: number;
  selectedUserId: string;
}) {
  const { data: logs, isLoading } = useMealLogs(year, month);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const allEntries = useMemo(
    () => (logs ? flattenMealEntries(logs) : []),
    [logs],
  );

  const entries = useMemo(() => {
    const filtered = selectedUserId
      ? allEntries.filter((e) => e.userId === selectedUserId)
      : allEntries;
    // 날짜 정렬 → 같은 날 안에서는 아침→점심→저녁 유지
    return [...filtered].sort((a, b) => {
      if (a.date !== b.date) {
        const cmp = a.date < b.date ? -1 : 1;
        return sortDir === "asc" ? cmp : -cmp;
      }
      return MEAL_ORDER[a.meal] - MEAL_ORDER[b.meal];
    });
  }, [allEntries, selectedUserId, sortDir]);

  const totalAmount = useMemo(
    () => entries.reduce((sum, e) => sum + e.amount, 0),
    [entries],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {/* Quick Stats */}
      <div className="flex items-center gap-5 rounded-xl border border-slate-200 bg-white px-5 py-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm text-slate-500">사용 건수</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">
            {entries.length}건
          </span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm text-slate-500">총 사용액</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">
            {formatCurrency(totalAmount)}
          </span>
          <span className="text-sm text-slate-400">원</span>
        </div>
      </div>

      {/* Usage List Table */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-white">
        <div className="h-full overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-slate-50 [&>tr>th]:h-9 [&>tr>th]:px-3 [&>tr>th]:py-0">
              <tr>
                <th className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  No.
                </th>
                <th className="w-28 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <button
                    type="button"
                    onClick={() =>
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                    }
                    className="inline-flex items-center gap-1 transition-colors hover:text-slate-700"
                    title="날짜순 정렬"
                  >
                    날짜
                    {sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
                <th className="w-24 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  이름
                </th>
                <th className="w-20 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  끼니
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  사용처
                </th>
                <th className="w-28 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  금액
                </th>
                <th className="w-28 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  결제자
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 7 }).map((_, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-1.5">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length > 0 ? (
                entries.map((entry, index) => (
                  <tr key={entry.key} className="table-row-interactive">
                    <td className="px-3 py-1.5 text-center text-sm text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-1.5 text-left text-sm tabular-nums text-slate-600">
                      {formatEntryDate(entry.date)}
                    </td>
                    <td className="px-3 py-1.5 text-left text-sm font-medium text-slate-900">
                      {entry.fullName}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                          mealBadgeStyle(entry.meal),
                        )}
                      >
                        {entry.meal}
                      </span>
                    </td>
                    <td className="max-w-0 truncate px-3 py-1.5 text-left text-sm text-slate-600">
                      {entry.store}
                    </td>
                    <td className="px-3 py-1.5 text-right text-sm font-medium tabular-nums text-slate-900">
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="px-3 py-1.5 text-left text-sm text-slate-500">
                      {entry.payer}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-4 text-lg font-medium text-slate-600">
                      식대 사용 내역이 없습니다
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      선택한 기간에 등록된 식대 사용 내역이 없습니다.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
