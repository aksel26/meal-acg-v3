"use client";

import { Fragment, useState, useMemo } from "react";
import dayjs from "dayjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import LeaveYearGrid from "@/components/dayoffs/LeaveYearGrid";
import { useDayoffsYearly } from "@/hooks/use-dayoffs";
import { useLeaveBalances } from "@/hooks/use-leave-balances";

interface ProfileLeaveTabProps {
  memberId: string;
}

function formatCount(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0$/, "");
}

export default function ProfileLeaveTab({ memberId }: ProfileLeaveTabProps) {
  const currentYear = dayjs().year();
  const [year, setYear] = useState(currentYear);

  const { data: dayoffs, isLoading } = useDayoffsYearly(memberId, year);
  const { data: leaveBalances } = useLeaveBalances(memberId, year);

  const years = Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i);

  const annualLeaveSummary = useMemo(() => {
    const balances = (leaveBalances || []).filter(
      (balance) => balance.type === "annual" || balance.type === "monthly",
    );

    const total = balances.reduce(
      (sum, balance) => sum + balance.granted + balance.adjusted,
      0,
    );
    const used = balances.reduce((sum, balance) => sum + balance.used, 0);
    const adjusted = balances.reduce(
      (sum, balance) => sum + balance.adjusted,
      0,
    );

    return { total, used, adjusted, remaining: total - used };
  }, [leaveBalances]);
  const leaveTypeCounts = useMemo(() => {
    return Object.entries(
      (dayoffs || []).reduce<Record<string, number>>((counts, dayoff) => {
        if (dayjs(dayoff.leave_date).isAfter(dayjs(), "day")) return counts;
        const name = dayoff.leave_type?.name ?? "기타 휴가";
        counts[name] = (counts[name] ?? 0) + 1;
        return counts;
      }, {}),
    );
  }, [dayoffs]);

  return (
    <div className="space-y-6">
      <div>
        <div className="grid grid-cols-[140px_1fr] items-center border-b border-slate-100 px-1 py-2">
          <div className="text-xs text-slate-500">연도</div>
          <Select
            value={year.toString()}
            onValueChange={(v) => setYear(parseInt(v))}
          >
            <SelectTrigger className="h-8 w-24 border-0 bg-transparent px-0 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-[140px_1fr] items-center border-b border-slate-100 px-1 py-3">
          <div className="text-xs text-slate-500">총 연차 개수</div>
          <div className="text-sm font-semibold text-slate-900">
            {formatCount(annualLeaveSummary.total)}일
          </div>
        </div>
        <div className="grid grid-cols-[140px_1fr] items-center border-b border-slate-100 px-1 py-3">
          <div className="text-xs text-slate-500">사용일수</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900">
              {formatCount(annualLeaveSummary.used)}일
            </span>
            <span aria-hidden="true" className="text-xs text-slate-300">
              ·
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {leaveTypeCounts.length > 0 ? (
                leaveTypeCounts.map(([name, count], index) => (
                  <Fragment key={name}>
                    {index > 0 && <span aria-hidden="true">·</span>}
                    <span>
                      {name} {count}개
                    </span>
                  </Fragment>
                ))
              ) : (
                <span>사용 내역 없음</span>
              )}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[140px_1fr] items-center border-b border-slate-100 px-1 py-3">
          <div className="text-xs text-slate-500">남은 연차개수</div>
          <div className="text-sm font-semibold text-slate-900">
            {formatCount(annualLeaveSummary.remaining)}일
          </div>
        </div>

        <div className="grid grid-cols-[140px_1fr] items-start border-b border-slate-100 px-1 py-3 text-xs text-slate-500">
          <span>총 연차 부여 기준</span>
          <div>
            <p className="leading-5">
              1년 미만: 1개월 개근 시 1일(최대 11일) · 1년 이상 3년 미만:
              15일(출근율 80% 이상) · 3년 이상: 최초 1년 초과 근속 2년마다 1일
              추가(최대 25일)
            </p>
            {annualLeaveSummary.adjusted !== 0 && (
              <p className="mt-1 text-slate-400">
                조정 연차 {formatCount(annualLeaveSummary.adjusted)}일이 총
                연차에 반영되었습니다.
              </p>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          로딩 중...
        </div>
      ) : (
        <LeaveYearGrid dayoffs={dayoffs ?? []} />
      )}
    </div>
  );
}
