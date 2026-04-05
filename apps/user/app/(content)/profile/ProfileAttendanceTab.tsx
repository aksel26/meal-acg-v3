"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Clock, CalendarCheck, AlertTriangle, Timer, Briefcase, Award } from "lucide-react";
import { useAttendanceMonthly } from "@/hooks/use-attendance-monthly";

dayjs.extend(utc);
dayjs.extend(timezone);

interface ProfileAttendanceTabProps {
  memberId: string;
  hireDate: string | null;
}

function formatMinutesToHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시간 ${m}분`;
}

function calcAverageTime(records: { check_in_at: string | null; check_out_at: string | null }[], field: "check_in_at" | "check_out_at") {
  const valid = records.filter((r) => r[field]);
  if (valid.length === 0) return null;

  const totalMinutes = valid.reduce((sum, r) => {
    const t = dayjs(r[field]!).tz("Asia/Seoul");
    return sum + t.hour() * 60 + t.minute();
  }, 0);

  const avg = Math.round(totalMinutes / valid.length);
  const h = Math.floor(avg / 60);
  const m = avg % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function ProfileAttendanceTab({ memberId, hireDate }: ProfileAttendanceTabProps) {
  const now = dayjs().tz("Asia/Seoul");
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);

  const { data, isLoading } = useAttendanceMonthly(memberId, year, month);

  const hireDateDayjs = hireDate ? dayjs(hireDate) : null;
  const yearsOfService = hireDateDayjs ? dayjs().diff(hireDateDayjs, "year") : null;
  const threeYearDate = hireDateDayjs ? hireDateDayjs.add(3, "year") : null;
  const fiveYearDate = hireDateDayjs ? hireDateDayjs.add(5, "year") : null;

  const currentYear = now.year();
  const years = Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const avgCheckIn = useMemo(() => {
    if (!data?.records) return null;
    return calcAverageTime(data.records, "check_in_at");
  }, [data?.records]);

  const avgCheckOut = useMemo(() => {
    if (!data?.records) return null;
    return calcAverageTime(data.records, "check_out_at");
  }, [data?.records]);

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">근태 현황</h2>
        <div className="flex gap-2">
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
          <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="h-9 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m.toString()}>{m}월</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Employment Milestones */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border bg-white p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">근속 정보</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="text-[11px] text-slate-400">입사일</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">
              {hireDateDayjs ? hireDateDayjs.format("YYYY-MM-DD") : "-"}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="text-[11px] text-slate-400">근속년수</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">
              {yearsOfService !== null ? `${yearsOfService}년` : "-"}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="text-[11px] text-slate-400">3년차</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">
              {threeYearDate ? threeYearDate.format("YYYY-MM-DD") : "-"}
            </div>
            {threeYearDate && dayjs().isAfter(threeYearDate) && (
              <span className="text-[10px] text-emerald-500">달성</span>
            )}
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="text-[11px] text-slate-400">5년차</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">
              {fiveYearDate ? fiveYearDate.format("YYYY-MM-DD") : "-"}
            </div>
            {fiveYearDate && dayjs().isAfter(fiveYearDate) && (
              <span className="text-[10px] text-emerald-500">달성</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Monthly Attendance Summary */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">로딩 중...</div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
          >
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-1 flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs text-slate-500">출근일수</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {data?.summary.total_work_days ?? 0}
                <span className="ml-1 text-sm font-normal text-slate-400">일</span>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs text-slate-500">지각</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {data?.summary.late_count ?? 0}
                <span className="ml-1 text-sm font-normal text-slate-400">회</span>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-1 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs text-slate-500">조퇴</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {data?.summary.early_leave_count ?? 0}
                <span className="ml-1 text-sm font-normal text-slate-400">회</span>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-1 flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-teal-500" />
                <span className="text-xs text-slate-500">시간외근무</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                <span className="text-base">{formatMinutesToHM(data?.summary.total_overtime_minutes ?? 0)}</span>
              </div>
            </div>
          </motion.div>

          {/* Average Check-in/out Times */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-xl border bg-white p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">
                {month}월 평균 출퇴근 시간
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 px-4 py-3 text-center">
                <div className="text-[11px] text-blue-500">평균 출근</div>
                <div className="mt-1 text-xl font-bold text-blue-700">
                  {avgCheckIn || "-"}
                </div>
              </div>
              <div className="rounded-lg bg-indigo-50 px-4 py-3 text-center">
                <div className="text-[11px] text-indigo-500">평균 퇴근</div>
                <div className="mt-1 text-xl font-bold text-indigo-700">
                  {avgCheckOut || "-"}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
