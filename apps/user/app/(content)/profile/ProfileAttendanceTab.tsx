"use client";

import { type ReactNode, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpDown, Ellipsis } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import LeaveYearGrid, {
  buildDummyLeaveRecords,
} from "@/components/dayoffs/LeaveYearGrid";
import {
  useAttendanceMonthly,
  type AttendanceRecord,
} from "@/hooks/use-attendance-monthly";
import { useDayoffsYearly, type DayoffRecord } from "@/hooks/use-dayoffs";
import { useLeaveBalances } from "@/hooks/use-leave-balances";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("ko");

interface ProfileAttendanceTabProps {
  memberId: string;
}

type SortKey = "date" | "attendance_type" | "status";
type SortDirection = "asc" | "desc";
type RecordView = "calendar" | "monthly" | "annual";
type MonthlyEntry = {
  date: string;
  record: AttendanceRecord | null;
  dayoffs: DayoffRecord[];
};

function formatRecordTime(value: string | null, format = "HH:mm") {
  if (!value) return "-";
  return dayjs(value).tz("Asia/Seoul").format(format);
}

function formatWorkTime(minutes: number) {
  if (minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function formatCount(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0$/, "");
}

function getLeaveDayAmount(dayoff: DayoffRecord) {
  if (!dayoff.leave_type || dayoff.leave_type.category === "지각/조퇴") {
    return 0;
  }
  if (dayoff.leave_type.category === "반반차") return 0.25;
  return dayoff.leave_type.duration_type === "full" ? 1 : 0.5;
}

type StatusLabel = { text: string; className: string };

const DEFAULT_STATUS_LABEL: StatusLabel = {
  text: "정상",
  className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

const STATUS_LABELS: Record<string, StatusLabel> = {
  early_check_in: {
    text: "조기출근",
    className: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  normal: DEFAULT_STATUS_LABEL,
  late: {
    text: "지각",
    className: "bg-rose-50 text-rose-700 ring-rose-100",
  },
  early_leave: {
    text: "조퇴",
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  },
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  근무: "bg-slate-100 text-slate-700",
  휴가: "bg-emerald-50 text-emerald-700",
  재택: "bg-amber-50 text-amber-700",
  외근: "bg-blue-50 text-blue-700",
};

const DAYOFF_STATUS_LABELS: Record<string, string> = {
  approved: "승인",
  pending: "대기",
  rejected: "반려",
  draft: "임시",
};

export default function ProfileAttendanceTab({
  memberId,
}: ProfileAttendanceTabProps) {
  const now = dayjs().tz("Asia/Seoul");
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [recordView, setRecordView] = useState<RecordView>("calendar");
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({ key: "date", direction: "desc" });

  const { data, isLoading: isAttendanceLoading } = useAttendanceMonthly(
    memberId,
    year,
    month,
  );
  const { data: yearlyDayoffs, isLoading: isDayoffsLoading } = useDayoffsYearly(
    memberId,
    year,
  );
  const { data: leaveBalances, isLoading: isLeaveBalancesLoading } =
    useLeaveBalances(memberId, year);

  const currentYear = now.year();
  const years = Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const dayoffs = useMemo(
    () =>
      (yearlyDayoffs ?? []).filter(
        (dayoff) => dayjs(dayoff.leave_date).month() + 1 === month,
      ),
    [yearlyDayoffs, month],
  );
  const dummyYearDayoffs = useMemo(() => buildDummyLeaveRecords(year), [year]);
  const displayedYearDayoffs = useMemo(
    () => [...(yearlyDayoffs ?? []), ...dummyYearDayoffs],
    [yearlyDayoffs, dummyYearDayoffs],
  );
  const calendarDayoffs = useMemo(
    () =>
      displayedYearDayoffs.filter(
        (dayoff) => dayjs(dayoff.leave_date).month() + 1 === month,
      ),
    [displayedYearDayoffs, month],
  );

  const monthlyRecords = useMemo(() => {
    return [...(data?.records ?? [])].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [data?.records]);
  const overtimeRecords = monthlyRecords.filter(
    (record) => record.overtime_minutes > 0,
  );
  const overtimeCount = overtimeRecords.length;
  const leaveDays = (dayoffs ?? [])
    .filter((dayoff) => dayoff.approval_status === "approved")
    .reduce((total, dayoff) => total + getLeaveDayAmount(dayoff), 0);
  const monthStart = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
  const weekdayCount = Array.from(
    { length: monthStart.daysInMonth() },
    (_, index) => monthStart.date(index + 1).day(),
  ).filter((day) => day !== 0 && day !== 6).length;
  const targetWorkDays = Math.max(0, weekdayCount - leaveDays);
  const annualLeaveSummary = useMemo(() => {
    const balances = (leaveBalances ?? []).filter(
      (balance) => balance.type === "annual" || balance.type === "monthly",
    );
    const total = balances.reduce(
      (sum, balance) => sum + balance.granted + balance.adjusted,
      0,
    );
    const used = balances.reduce((sum, balance) => sum + balance.used, 0);
    return { total, used, remaining: total - used };
  }, [leaveBalances]);
  const monthlyEntries = useMemo(() => {
    const entries = new Map<string, MonthlyEntry>();

    for (const record of data?.records ?? []) {
      entries.set(record.date, { date: record.date, record, dayoffs: [] });
    }
    for (const dayoff of dayoffs ?? []) {
      if (getLeaveDayAmount(dayoff) === 0) continue;
      const entry = entries.get(dayoff.leave_date) ?? {
        date: dayoff.leave_date,
        record: null,
        dayoffs: [],
      };
      entry.dayoffs.push(dayoff);
      entries.set(dayoff.leave_date, entry);
    }

    const direction = sort.direction === "asc" ? 1 : -1;
    return [...entries.values()].sort((a, b) => {
      const comparison =
        sort.key === "date"
          ? a.date.localeCompare(b.date)
          : sort.key === "attendance_type"
            ? (a.record?.attendance_type ?? "휴가").localeCompare(
                b.record?.attendance_type ?? "휴가",
                "ko",
              )
            : (
                STATUS_LABELS[a.record?.status ?? ""]?.text ??
                DAYOFF_STATUS_LABELS[a.dayoffs[0]?.approval_status ?? ""] ??
                ""
              ).localeCompare(
                STATUS_LABELS[b.record?.status ?? ""]?.text ??
                  DAYOFF_STATUS_LABELS[b.dayoffs[0]?.approval_status ?? ""] ??
                  "",
                "ko",
              );

      return comparison * direction || b.date.localeCompare(a.date);
    });
  }, [data?.records, dayoffs, sort]);
  const selectedRecord = monthlyRecords.find(
    (record) => record.date === selectedDate,
  );
  const selectedLeaveDetails = displayedYearDayoffs.filter(
    (dayoff) => dayoff.leave_date === selectedDate,
  );

  const summary = data?.summary;
  const issueCount =
    (summary?.late_count ?? 0) + (summary?.early_leave_count ?? 0);
  const monthLabel = `${year}년 ${month}월`;
  const issueLabel = issueCount > 0 ? `${issueCount}건 확인 필요` : "이상 없음";
  const handleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key
          ? current.direction === "asc"
            ? "desc"
            : "asc"
          : key === "date"
            ? "desc"
            : "asc",
    }));
  };

  return (
    <div className="space-y-4">
      <RecordViewSegment value={recordView} onChange={setRecordView} />
      {isAttendanceLoading || isDayoffsLoading || isLeaveBalancesLoading ? (
        <div className="rounded-xl bg-white py-10 text-center text-sm text-slate-400">
          로딩 중...
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={
              recordView === "calendar"
                ? "grid gap-6 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-4 xl:gap-x-14"
                : undefined
            }
          >
            {recordView === "calendar" && (
              <section className="lg:row-span-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    캘린더
                  </h3>
                  <div className="flex shrink-0 gap-2">
                    <Select
                      value={year.toString()}
                      onValueChange={(value) => {
                        setYear(parseInt(value));
                        setSelectedDate(null);
                      }}
                    >
                      <SelectTrigger
                        aria-label="연도 선택"
                        className="h-8 w-24 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((item) => (
                          <SelectItem key={item} value={item.toString()}>
                            {item}년
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={month.toString()}
                      onValueChange={(value) => {
                        setMonth(parseInt(value));
                        setSelectedDate(null);
                      }}
                    >
                      <SelectTrigger
                        aria-label="월 선택"
                        className="h-8 w-20 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((item) => (
                          <SelectItem key={item} value={item.toString()}>
                            {item}월
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <AttendanceCalendar
                  year={year}
                  month={month}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  records={monthlyRecords}
                  dayoffs={calendarDayoffs}
                />
              </section>
            )}

            {recordView !== "annual" && (
              <section>
                {recordView === "calendar" && (
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {monthLabel} 근태 요약
                    </h3>
                    <span
                      className={`text-xs font-medium ${
                        issueCount > 0 ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {issueLabel}
                    </span>
                  </div>
                )}
                <div>
                  {recordView === "monthly" && (
                    <div className="grid h-[42.25px] grid-cols-[120px_1fr] items-center border-b border-slate-100">
                      <span className="text-xs text-slate-500">월 선택</span>
                      <Select
                        value={month.toString()}
                        onValueChange={(value) => {
                          setMonth(parseInt(value));
                          setSelectedDate(null);
                        }}
                      >
                        <SelectTrigger
                          aria-label="월 선택"
                          className="h-8 w-20 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus:ring-0"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((item) => (
                            <SelectItem key={item} value={item.toString()}>
                              {item}월
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <StatRow
                    label="출근일수"
                    value={
                      <>
                        <span className="font-semibold">
                          {summary?.total_work_days ?? 0}일
                        </span>
                        <span className="text-slate-400">
                          {" "}
                          / {targetWorkDays}일
                        </span>
                      </>
                    }
                    muted
                  />
                  <StatRow label="휴가" value={`${formatCount(leaveDays)}일`} />
                  <StatRow
                    label="시간외근무"
                    value={`${overtimeCount}회`}
                    action={
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="시간외근무 상세보기"
                            title="시간외근무 상세보기"
                            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                          >
                            <Ellipsis className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 p-0">
                          <div className="border-b border-slate-100 px-4 py-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {monthLabel} 시간외근무
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {overtimeCount}건
                            </p>
                          </div>
                          {overtimeRecords.length > 0 ? (
                            <div className="max-h-72 overflow-y-auto">
                              {overtimeRecords.map((record) => (
                                <div
                                  key={record.id}
                                  className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">
                                      {dayjs(record.date).format(
                                        "M월 D일 (ddd)",
                                      )}
                                    </p>
                                    <p className="mt-0.5 text-xs tabular-nums text-slate-400">
                                      {formatRecordTime(record.check_in_at)} -{" "}
                                      {formatRecordTime(record.check_out_at)}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-sm font-medium text-slate-700">
                                    {formatWorkTime(record.overtime_minutes)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-slate-400">
                              시간외근무 내역이 없습니다.
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    }
                  />
                  <StatRow label="지각/조퇴" value={`${issueCount}회`} />
                </div>
              </section>
            )}

            {recordView !== "monthly" && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  연차 요약
                </h3>
                <div>
                  <StatRow
                    label="총 연차"
                    value={`${formatCount(annualLeaveSummary.total)}일`}
                  />
                  <StatRow
                    label="사용일수"
                    value={`${formatCount(annualLeaveSummary.used)}일`}
                  />
                  <StatRow
                    label="남은 연차"
                    value={`${formatCount(annualLeaveSummary.remaining)}일`}
                  />
                  <div className="grid grid-cols-[120px_1fr] items-start border-b border-slate-100 py-3 text-xs text-slate-500 transition-colors hover:bg-slate-50">
                    <span>총 연차 부여 기준</span>
                    <p className="leading-5">
                      1년 미만: 1개월 개근 시 1일(최대 11일) · 1년 이상 3년
                      미만: 15일(출근율 80% 이상) · 3년 이상: 최초 1년 초과 근속
                      2년마다 1일 추가(최대 25일)
                    </p>
                  </div>
                </div>
              </section>
            )}
            {recordView === "calendar" && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.03 }}
                className="lg:col-span-2"
              >
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  근태 상세
                </h3>

                {!selectedDate ? (
                  <div className="border-b border-slate-100 py-6 text-center text-sm text-slate-400">
                    캘린더 또는 월간 기록에서 날짜를 선택하세요.
                  </div>
                ) : !selectedRecord && selectedLeaveDetails.length === 0 ? (
                  <div className="border-b border-slate-100 py-6 text-center text-sm text-slate-400">
                    선택한 날짜의 근태 내역이 없습니다.
                  </div>
                ) : (
                  <div className="grid gap-8 md:min-h-40 md:grid-cols-2">
                    {selectedRecord && selectedLeaveDetails.length === 0 && (
                      <div className="grid gap-x-8 md:col-span-2 md:grid-cols-2">
                        <div>
                          <DetailRow
                            label="출근 일자"
                            value={dayjs(selectedRecord.date).format(
                              "YYYY년 M월 D일 (ddd)",
                            )}
                          />
                          <DetailRow
                            label="유형"
                            value={selectedRecord.attendance_type ?? "근무"}
                          />
                          <DetailRow
                            label="상태"
                            value={
                              STATUS_LABELS[selectedRecord.status]?.text ??
                              selectedRecord.status
                            }
                          />
                        </div>
                        <div>
                          <DetailRow
                            label="출근 시간"
                            value={formatRecordTime(
                              selectedRecord.check_in_at,
                              "HH:mm:ss",
                            )}
                          />
                          <DetailRow
                            label="퇴근 시간"
                            value={formatRecordTime(
                              selectedRecord.check_out_at,
                              "HH:mm:ss",
                            )}
                          />
                          <DetailRow
                            label="근무 시간"
                            value={formatWorkTime(selectedRecord.work_minutes)}
                          />
                          <DetailRow
                            label="시간외근무 (시간)"
                            value={formatWorkTime(
                              selectedRecord.overtime_minutes,
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {selectedLeaveDetails.length > 0 && (
                      <div className="md:col-span-2">
                        {selectedLeaveDetails.map((leave) => (
                          <div
                            key={leave.id}
                            className="mb-3 grid gap-x-8 md:grid-cols-2 last:mb-0"
                          >
                            <div>
                              <DetailRow
                                label="유형"
                                value={leave.leave_type?.name ?? "휴가"}
                              />
                              <DetailRow
                                label="사유"
                                value={leave.reason ?? "-"}
                              />
                            </div>
                            <div>
                              <DetailRow
                                label="승인 상태"
                                value={
                                  DAYOFF_STATUS_LABELS[
                                    leave.approval_status ?? ""
                                  ] ??
                                  leave.approval_status ??
                                  "-"
                                }
                              />
                              <DetailRow
                                label="승인자"
                                value={leave.approver?.full_name ?? "-"}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.section>
            )}
          </motion.div>

          {recordView !== "calendar" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <section className="min-w-0">
                {recordView === "annual" ? (
                  <LeaveYearGrid
                    dayoffs={displayedYearDayoffs}
                    onRecordSelect={(date) => {
                      setSelectedDate(date);
                      setMonth(dayjs(date).month() + 1);
                    }}
                  />
                ) : monthlyEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
                          <SortableHeader
                            label="날짜"
                            sortKey="date"
                            activeKey={sort.key}
                            direction={sort.direction}
                            onSort={handleSort}
                          />
                          <th scope="col" className="px-3 py-2 font-medium">
                            출근
                          </th>
                          <th scope="col" className="px-3 py-2 font-medium">
                            퇴근
                          </th>
                          <th scope="col" className="px-3 py-2 font-medium">
                            근무시간
                          </th>
                          <SortableHeader
                            label="근태유형"
                            sortKey="attendance_type"
                            activeKey={sort.key}
                            direction={sort.direction}
                            onSort={handleSort}
                          />
                          <th scope="col" className="px-3 py-2 font-medium">
                            휴가
                          </th>
                          <th scope="col" className="px-3 py-2 font-medium">
                            시간외근무
                          </th>
                          <SortableHeader
                            label="상태"
                            sortKey="status"
                            activeKey={sort.key}
                            direction={sort.direction}
                            onSort={handleSort}
                          />
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyEntries.map((entry) => {
                          const record = entry.record;
                          const dayoffStatus =
                            entry.dayoffs[0]?.approval_status ?? "";
                          const statusInfo = record
                            ? (STATUS_LABELS[record.status] ??
                              DEFAULT_STATUS_LABEL)
                            : {
                                text:
                                  DAYOFF_STATUS_LABELS[dayoffStatus] ??
                                  dayoffStatus ??
                                  "-",
                                className:
                                  dayoffStatus === "approved"
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : dayoffStatus === "rejected"
                                      ? "bg-rose-50 text-rose-700 ring-rose-100"
                                      : "bg-slate-100 text-slate-600 ring-slate-200",
                              };
                          const attendanceType =
                            record?.attendance_type ?? "휴가";
                          const typeClass =
                            TYPE_BADGE_STYLES[attendanceType] ||
                            TYPE_BADGE_STYLES["근무"];

                          return (
                            <tr
                              key={entry.date}
                              role="button"
                              tabIndex={0}
                              aria-label={`${dayjs(entry.date).format("M월 D일")} 근태 상세보기`}
                              onClick={() => setSelectedDate(entry.date)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  setSelectedDate(entry.date);
                                }
                              }}
                              className={`cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none ${
                                selectedDate === entry.date ? "bg-slate-50" : ""
                              }`}
                            >
                              <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-800">
                                {dayjs(entry.date).format("M월 D일 (ddd)")}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">
                                {formatRecordTime(record?.check_in_at ?? null)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">
                                {formatRecordTime(record?.check_out_at ?? null)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                                {formatWorkTime(record?.work_minutes ?? 0)}
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeClass}`}
                                >
                                  {attendanceType}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                {entry.dayoffs.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {entry.dayoffs.map((dayoff) => (
                                      <span
                                        key={dayoff.id}
                                        title={dayoff.reason ?? undefined}
                                        className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                                      >
                                        {dayoff.leave_type?.name ?? "휴가"} ·{" "}
                                        {DAYOFF_STATUS_LABELS[
                                          dayoff.approval_status
                                        ] ?? dayoff.approval_status}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                                {formatWorkTime(record?.overtime_minutes ?? 0)}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusInfo.className}`}
                                  >
                                    {statusInfo.text}
                                  </span>
                                  {record?.modification_status && (
                                    <span className="text-xs text-amber-700">
                                      수정 요청
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border-b border-slate-100 py-8 text-center text-sm text-slate-500">
                    이번 달 출퇴근 기록이 없습니다.
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center border-b border-slate-100 py-2.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}

function RecordViewSegment({
  value,
  onChange,
}: {
  value: RecordView;
  onChange: (value: RecordView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="근태 기록 보기"
      className="inline-flex rounded-lg bg-slate-100 p-1"
    >
      {(
        [
          ["calendar", "캘린더"],
          ["monthly", "월간 기록"],
          ["annual", "연차 내역"],
        ] as const
      ).map(([view, label]) => (
        <button
          key={view}
          type="button"
          role="tab"
          aria-selected={value === view}
          onClick={() => onChange(view)}
          className={`h-7 rounded-md px-2.5 text-xs font-medium transition-colors ${
            value === view
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sortKey === activeKey;
  const SortIcon = !isActive
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={
        isActive ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
      className="px-3 py-2 font-medium"
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          aria-label={`${label} 정렬`}
          title={`${label} 정렬`}
          className={`rounded p-0.5 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
            isActive ? "text-slate-700" : "text-slate-400"
          }`}
        >
          <SortIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </th>
  );
}

function StatRow({
  label,
  value,
  action,
  muted = false,
}: {
  label: string;
  value: ReactNode;
  action?: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center border-b border-slate-100 py-3 transition-colors hover:bg-slate-50">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-1">
        <span
          className={`text-sm tabular-nums ${
            muted
              ? "font-normal text-slate-900"
              : "font-semibold text-slate-900"
          }`}
        >
          {value}
        </span>
        {action}
      </div>
    </div>
  );
}
