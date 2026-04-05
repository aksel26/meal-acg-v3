"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import dayjs from "dayjs";
import { Badge } from "@repo/ui/src/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { cn } from "@repo/ui/lib/utils";
import { useDayoffsYearly, type DayoffRecord } from "@/hooks/use-dayoffs";
import { useLeaveBalances } from "@/hooks/use-leave-balances";

const LEAVE_TYPE_COLORS: Record<string, string> = {
  "지각/조퇴": "bg-orange-50 text-orange-700 border-orange-200",
  반차: "bg-purple-50 text-purple-700 border-purple-200",
  연차: "bg-yellow-50 text-yellow-700 border-yellow-200",
  대체휴무: "bg-blue-50 text-blue-700 border-blue-200",
  경조휴무: "bg-pink-50 text-pink-700 border-pink-200",
  특별휴무: "bg-teal-50 text-teal-700 border-teal-200",
  훈련: "bg-slate-50 text-slate-700 border-slate-200",
  휴무: "bg-green-50 text-green-700 border-green-200",
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  monthly: "월차",
  annual: "연차",
  summer: "하계휴가",
};

interface ProfileLeaveTabProps {
  memberId: string;
  hireDate: string | null;
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

  return (
    <div className="space-y-6">
      {/* Header with year selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">휴가 현황</h2>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="h-9 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">입사일</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">
            {hireDateDayjs ? hireDateDayjs.format("YYYY-MM-DD") : "-"}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">근속년수</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">
            {yearsOfService !== null ? `${yearsOfService}년` : "-"}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">{year}년 사용일수</div>
          <div className="mt-1 text-sm font-semibold text-red-600">
            {monthlyData.total}일
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">{year}년 총 건수</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">
            {dayoffs?.length || 0}건
          </div>
        </div>
      </motion.div>

      {/* Leave Balances */}
      {leaveBalances && leaveBalances.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          {leaveBalances.map((balance) => {
            const remaining = balance.granted + balance.adjusted - balance.used;
            return (
              <div key={balance.id} className="rounded-xl border bg-white p-4">
                <div className="mb-2 text-xs font-medium text-slate-500">
                  {LEAVE_TYPE_LABELS[balance.type] || balance.type}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">{remaining}</span>
                  <span className="text-sm text-slate-400">일 남음</span>
                </div>
                <div className="mt-2 flex gap-3 text-[11px] text-slate-400">
                  <span>부여 {balance.granted}</span>
                  <span>사용 {balance.used}</span>
                  {balance.adjusted !== 0 && <span>조정 {balance.adjusted > 0 ? "+" : ""}{balance.adjusted}</span>}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Monthly Grid */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">로딩 중...</div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="overflow-x-auto rounded-xl border bg-white"
        >
          <div className="grid min-w-[1200px] grid-cols-12">
            {monthlyData.months.map((md) => {
              const prevCumulative = monthlyData.months
                .slice(0, md.month - 1)
                .reduce((sum, m) => sum + m.count, 0);
              const cumulative = prevCumulative + md.count;

              return (
                <div key={md.month} className={cn("flex flex-col", md.month < 12 && "border-r border-slate-100")}>
                  <div className="border-b bg-slate-50 px-2 py-2 text-center">
                    <span className="text-xs font-semibold text-slate-700">{md.month}월</span>
                  </div>
                  <div className="flex-1 divide-y divide-slate-50">
                    {md.records.length > 0 ? (
                      md.records.map((record) => {
                        const date = dayjs(record.leave_date);
                        const category = record.leave_type?.category || "";
                        const colorClass = LEAVE_TYPE_COLORS[category] || "bg-gray-50 text-gray-700 border-gray-200";
                        return (
                          <div key={record.id} className="px-2 py-1 hover:bg-slate-50">
                            <div className="text-xs text-slate-600">{date.format("D")}일</div>
                            <div className="mt-0.5">
                              <Badge variant="outline" className={`text-[10px] ${colorClass}`}>
                                {record.leave_type_id === 1 && record.late_hour
                                  ? `지각-${record.late_hour}시${record.late_minute || "00"}분`
                                  : record.leave_type?.name || ""}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-2 py-3 text-center text-xs text-slate-300">-</div>
                    )}
                  </div>
                  <div className="mt-auto border-t border-slate-200 bg-slate-50/70">
                    <div className="flex justify-between px-2 py-1 text-[10px] text-slate-400">
                      <span>이전</span>
                      <span>{prevCumulative > 0 ? prevCumulative : "-"}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 px-2 py-1 text-[10px] text-slate-500">
                      <span>합계</span>
                      <span className="font-medium">{md.count > 0 ? md.count : "-"}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 bg-slate-100/70 px-2 py-1 text-[10px] font-semibold text-red-600">
                      <span>누적</span>
                      <span>{cumulative > 0 ? cumulative : "-"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
