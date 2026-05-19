"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
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
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function calcAverageTime(
  records: { check_in_at: string | null; check_out_at: string | null }[],
  field: "check_in_at" | "check_out_at",
) {
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

function calcExtremeTime(
  records: { check_in_at: string | null; check_out_at: string | null }[],
  field: "check_in_at" | "check_out_at",
  mode: "min" | "max",
) {
  const valid = records
    .filter((r) => r[field])
    .map((r) => dayjs(r[field]!).tz("Asia/Seoul"));
  if (valid.length === 0) return null;

  const selected = valid.reduce((target, current) => {
    const currentMinutes = current.hour() * 60 + current.minute();
    const targetMinutes = target.hour() * 60 + target.minute();
    return mode === "min"
      ? currentMinutes < targetMinutes
        ? current
        : target
      : currentMinutes > targetMinutes
        ? current
        : target;
  });

  return selected.format("HH:mm");
}

function formatRecordTime(value: string | null) {
  if (!value) return "-";
  return dayjs(value).tz("Asia/Seoul").format("HH:mm");
}

export default function ProfileAttendanceTab({
  memberId,
  hireDate,
}: ProfileAttendanceTabProps) {
  const now = dayjs().tz("Asia/Seoul");
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);

  const { data, isLoading } = useAttendanceMonthly(memberId, year, month);

  const hireDateDayjs = hireDate ? dayjs(hireDate) : null;
  const yearsOfService = hireDateDayjs
    ? dayjs().diff(hireDateDayjs, "year")
    : null;
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

  const earliestCheckIn = useMemo(() => {
    if (!data?.records) return null;
    return calcExtremeTime(data.records, "check_in_at", "min");
  }, [data?.records]);

  const latestCheckOut = useMemo(() => {
    if (!data?.records) return null;
    return calcExtremeTime(data.records, "check_out_at", "max");
  }, [data?.records]);

  const recentIssues = useMemo(() => {
    if (!data?.records) return [];

    return data.records
      .flatMap((record) => {
        const dateLabel = dayjs(record.date).format("M월 D일");
        const items: { key: string; title: string; description: string }[] = [];

        if (record.status === "late") {
          items.push({
            key: `${record.id}-late`,
            title: "최근 지각",
            description: `${dateLabel} ${formatRecordTime(record.check_in_at)} 출근`,
          });
        }

        if (record.status === "early_leave") {
          items.push({
            key: `${record.id}-early-leave`,
            title: "최근 조퇴",
            description: `${dateLabel} ${formatRecordTime(record.check_out_at)} 퇴근`,
          });
        }

        if (record.modification_status) {
          items.push({
            key: `${record.id}-modify`,
            title: "수정 요청",
            description: `${dateLabel} ${record.modification_status}`,
          });
        }

        return items;
      })
      .slice(0, 5);
  }, [data?.records]);

  const summary = data?.summary;
  const issueCount =
    (summary?.late_count ?? 0) + (summary?.early_leave_count ?? 0);
  const monthLabel = `${year}년 ${month}월`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Attendance
          </p>
          <h2 className="mt-0.5 text-lg font-semibold text-slate-950">
            근태/통계
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            월별 출퇴근 흐름과 근속 기준일을 한눈에 확인합니다.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select
            value={year.toString()}
            onChange={(e) => setYear(parseInt(e.target.value))}
            aria-label="연도 선택"
            className="h-8 w-full appearance-none rounded-lg bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 sm:w-24"
          >
            {years.map((y) => (
              <option key={y} value={y.toString()}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={month.toString()}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            aria-label="월 선택"
            className="h-8 w-full appearance-none rounded-lg bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 sm:w-20"
          >
            {months.map((m) => (
              <option key={m} value={m.toString()}>
                {m}월
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl bg-white py-10 text-center text-sm text-slate-400">
          로딩 중...
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden rounded-xl bg-white"
          >
            <div className="px-0 pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {monthLabel} 근태 요약
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    근무 시간, 지각/조퇴, 평균 출퇴근 시간을 함께 보여줍니다.
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {issueCount > 0 ? `${issueCount}건 확인 필요` : "안정"}
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="출근일수"
                value={`${summary?.total_work_days ?? 0}일`}
              />
              <SummaryCard
                label="총 근무"
                value={formatMinutesToHM(summary?.total_work_minutes ?? 0)}
              />
              <SummaryCard
                label="시간외근무"
                value={formatMinutesToHM(summary?.total_overtime_minutes ?? 0)}
              />
              <SummaryCard label="지각/조퇴" value={`${issueCount}회`} />
            </div>
          </motion.div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="rounded-xl bg-white"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    평균 출퇴근 시간
                  </h3>
                  <p className="text-xs text-slate-500">
                    출퇴근 기록이 있는 날짜 기준
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <TimePanel
                  label="평균 출근"
                  value={avgCheckIn || "-"}
                  description="출근 기록 평균"
                />
                <TimePanel
                  label="평균 퇴근"
                  value={avgCheckOut || "-"}
                  description="퇴근 기록 평균"
                />
                <TimePanel
                  label="가장 빠른 출근"
                  value={earliestCheckIn || "-"}
                  description="이번 달 최저 출근 시각"
                />
                <TimePanel
                  label="가장 늦은 퇴근"
                  value={latestCheckOut || "-"}
                  description="이번 달 최고 퇴근 시각"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="rounded-xl bg-white"
            >
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  근속 정보
                </h3>
                <p className="text-xs text-slate-500">입사일 기준 마일스톤</p>
              </div>

              <div className="space-y-1.5">
                <MilestoneRow
                  label="입사일"
                  value={
                    hireDateDayjs ? hireDateDayjs.format("YYYY-MM-DD") : "-"
                  }
                />
                <MilestoneRow
                  label="근속년수"
                  value={yearsOfService !== null ? `${yearsOfService}년` : "-"}
                />
                <MilestoneRow
                  label="3년차"
                  value={
                    threeYearDate ? threeYearDate.format("YYYY-MM-DD") : "-"
                  }
                  achieved={!!threeYearDate && dayjs().isAfter(threeYearDate)}
                />
                <MilestoneRow
                  label="5년차"
                  value={fiveYearDate ? fiveYearDate.format("YYYY-MM-DD") : "-"}
                  achieved={!!fiveYearDate && dayjs().isAfter(fiveYearDate)}
                />
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="rounded-xl bg-white"
          >
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-slate-900">
                최근 특이사항
              </h3>
              <p className="text-xs text-slate-500">
                지각, 조퇴, 수정 요청이 있는 날짜를 보여줍니다.
              </p>
            </div>

            {recentIssues.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {recentIssues.map((issue) => (
                  <RecentIssueRow
                    key={issue.key}
                    title={issue.title}
                    description={issue.description}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">
                최근 특이사항이 없습니다.
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <p className="mt-0.5 text-lg font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TimePanel({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-slate-700">
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function RecentIssueRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">
        {description}
      </p>
    </div>
  );
}

function MilestoneRow({
  label,
  value,
  achieved = false,
}: {
  label: string;
  value: string;
  achieved?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        {value}
        {achieved && (
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
            달성
          </span>
        )}
      </span>
    </div>
  );
}
