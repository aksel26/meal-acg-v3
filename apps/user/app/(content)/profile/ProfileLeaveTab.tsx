"use client";

import { useState, useMemo } from "react";
import dayjs from "dayjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { useDayoffsYearly, type DayoffRecord } from "@/hooks/use-dayoffs";
import { useLeaveBalances } from "@/hooks/use-leave-balances";

const LEAVE_TYPE_COLORS: Record<string, string> = {
  "지각/조퇴": "bg-orange-50 text-orange-700",
  반차: "bg-violet-50 text-violet-700",
  연차: "bg-amber-50 text-amber-700",
  대체휴무: "bg-blue-50 text-blue-700",
  경조휴무: "bg-rose-50 text-rose-700",
  특별휴무: "bg-teal-50 text-teal-700",
  훈련: "bg-slate-100 text-slate-700",
  휴무: "bg-emerald-50 text-emerald-700",
};

interface ProfileLeaveTabProps {
  memberId: string;
  hireDate: string | null;
}

function formatCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");
}

export default function ProfileLeaveTab({ memberId, hireDate }: ProfileLeaveTabProps) {
  const currentYear = dayjs().year();
  const [year, setYear] = useState(currentYear);

  const { data: dayoffs, isLoading } = useDayoffsYearly(memberId, year);
  const { data: leaveBalances } = useLeaveBalances(memberId, year);

  const hireDateDayjs = hireDate ? dayjs(hireDate) : null;
  const yearsOfService = hireDateDayjs ? dayjs().diff(hireDateDayjs, "year") : null;

  const years = Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i);

  const monthlyData = useMemo(() => {
    const months: { month: number; records: DayoffRecord[]; count: number }[] = [];

    for (let m = 1; m <= 12; m++) {
      const records = (dayoffs || [])
        .filter((d) => dayjs(d.leave_date).month() + 1 === m)
        .sort((a, b) => a.leave_date.localeCompare(b.leave_date));

      const count = records.reduce((sum, r) => {
        const cat = r.leave_type?.category || "";
        return sum + (cat === "반차" ? 0.5 : 1);
      }, 0);

      months.push({ month: m, records, count });
    }

    const total = months.reduce((sum, m) => sum + m.count, 0);
    return { months, total };
  }, [dayoffs]);
  const remainingAnnualLeave = useMemo(() => {
    return (leaveBalances || [])
      .filter((balance) => balance.type === "annual" || balance.type === "monthly")
      .reduce(
        (sum, balance) =>
          sum + balance.granted + balance.adjusted - balance.used,
        0,
      );
  }, [leaveBalances]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">휴가 현황</h2>
          <p className="mt-1 text-sm text-slate-500">
            연도별 휴가 잔여와 사용 내역을 확인합니다.
          </p>
        </div>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="h-9 w-24 border-0 bg-slate-50 shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-4 py-4">
          <div className="text-xs text-slate-500">남은 연차개수</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {formatCount(remainingAnnualLeave)}일
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-4">
          <div className="text-xs text-slate-500">{year}년 사용일수</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {formatCount(monthlyData.total)}일{" "}
            <span className="text-sm font-medium text-slate-400">
              ({dayoffs?.length || 0}건)
            </span>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-4">
          <div className="text-xs text-slate-500">입사일</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {hireDateDayjs ? hireDateDayjs.format("YYYY-MM-DD") : "-"}
            {yearsOfService !== null && (
              <span className="ml-1 text-sm font-medium text-slate-400">
                ({yearsOfService}년)
              </span>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">로딩 중...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white">
          <div className="grid min-w-[1200px] grid-cols-12 gap-2 p-2">
            {monthlyData.months.map((md) => {
              const prevCumulative = monthlyData.months
                .slice(0, md.month - 1)
                .reduce((sum, m) => sum + m.count, 0);
              const cumulative = prevCumulative + md.count;

              return (
                <div key={md.month} className="flex flex-col overflow-hidden rounded-xl bg-slate-50">
                  <div className="bg-white px-2 py-2 text-center">
                    <span className="text-xs font-semibold text-slate-700">{md.month}월</span>
                  </div>
                  <div className="flex-1 space-y-1 px-2 py-2">
                    {md.records.length > 0 ? (
                      md.records.map((record) => {
                        const date = dayjs(record.leave_date);
                        const category = record.leave_type?.category || "";
                        const colorClass = LEAVE_TYPE_COLORS[category] || "bg-slate-100 text-slate-700";
                        return (
                          <div key={record.id} className="rounded-lg bg-white px-2 py-2 transition-colors hover:bg-slate-100">
                            <div className="text-xs text-slate-600">{date.format("D")}일</div>
                            <div className="mt-1">
                              <span className={`flex w-full justify-center rounded-md px-2 py-0.5 text-center text-[10px] font-medium ${colorClass}`}>
                                {record.leave_type_id === 1 && record.late_hour
                                  ? `지각-${record.late_hour}시${record.late_minute || "00"}분`
                                  : record.leave_type?.name || ""}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-2 py-3 text-center text-xs text-slate-300">-</div>
                    )}
                  </div>
                  <div className="mt-auto bg-white/70">
                    <div className="flex justify-between px-2 py-1 text-[10px] text-slate-400">
                      <span>이전</span>
                      <span>{prevCumulative > 0 ? prevCumulative : "-"}</span>
                    </div>
                    <div className="flex justify-between px-2 py-1 text-[10px] text-slate-500">
                      <span>합계</span>
                      <span className="font-medium">{md.count > 0 ? md.count : "-"}</span>
                    </div>
                    <div className="flex justify-between bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                      <span>누적</span>
                      <span>{cumulative > 0 ? cumulative : "-"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
