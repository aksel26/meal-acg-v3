"use client";

import { motion } from "motion/react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { DayoffRecord } from "@/hooks/use-dayoffs";

dayjs.locale("ko");
dayjs.extend(utc);
dayjs.extend(timezone);

interface AttendanceRecord {
  id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  attendance_type: string;
  status: string;
  overtime_minutes: number;
  work_minutes: number;
  modification_status: string | null;
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  근무: "bg-slate-100 text-slate-700",
  휴가: "bg-emerald-50 text-emerald-700",
  재택: "bg-amber-50 text-amber-700",
  외근: "bg-violet-50 text-violet-700",
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  normal: { text: "정상", color: "text-emerald-600" },
  late: { text: "지각", color: "text-rose-600" },
  early_leave: { text: "조퇴", color: "text-amber-600" },
};
const DEFAULT_STATUS_INFO = { text: "정상", color: "text-emerald-600" };

function formatTime(isoString: string | null): string {
  if (!isoString) return "-";
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm:ss");
}

function formatCheckoutTime(isoString: string | null): string {
  if (!isoString) return "근무중";
  return formatTime(isoString);
}

function formatWorkTime(minutes: number): string {
  if (minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

interface AttendanceCardProps {
  selectedDate: string;
  record: AttendanceRecord | null;
  dayoffs?: DayoffRecord[];
  onModifyRequest: () => void;
}

export default function AttendanceCard({
  selectedDate,
  record,
  dayoffs = [],
  onModifyRequest,
}: AttendanceCardProps) {
  const d = dayjs(selectedDate);
  const dateLabel = `${d.format("M월 D일")} (${d.format("dd")})`;

  if (!record) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-xl bg-white p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold text-[#111111]">{dateLabel}</span>
        </div>
        <div className="mb-4 flex items-center gap-4">
          <div className="w-full rounded-lg bg-slate-50 px-3 py-3 text-center">
            <p className="mb-0.5 text-xs text-slate-500">출근시간</p>
            <p className="text-lg font-semibold text-[#111111]">출근 전</p>
          </div>
        </div>
        <DayoffSummary
          dayoffs={dayoffs}
        />
      </motion.div>
    );
  }

  const badgeStyle =
    TYPE_BADGE_STYLES[record.attendance_type] || "bg-slate-100 text-slate-700";
  const statusInfo = STATUS_LABELS[record.status] || DEFAULT_STATUS_INFO;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl bg-white p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-semibold text-[#111111]">{dateLabel}</span>
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${badgeStyle}`}
        >
          {record.attendance_type}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1 rounded-lg bg-slate-50 px-3 py-3 text-center">
          <p className="mb-0.5 text-xs text-slate-500">출근시간</p>
          <p className="text-lg font-semibold text-[#111111]">
            {formatTime(record.check_in_at)}
          </p>
        </div>
        <div className="flex-1 rounded-lg bg-slate-50 px-3 py-3 text-center">
          <p className="mb-0.5 text-xs text-slate-500">퇴근시간</p>
          <p className="text-lg font-semibold text-[#111111]">
            {formatCheckoutTime(record.check_out_at)}
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">출근현황</span>
          <span className={`text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">근무시간</span>
          <span className="text-sm font-medium text-[#111111]">
            {formatWorkTime(record.work_minutes)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">초과시간</span>
          <span className="text-sm font-medium text-[#111111]">
            {formatWorkTime(record.overtime_minutes)}
          </span>
        </div>
      </div>

      <DayoffSummary
        dayoffs={dayoffs}
      />

      {record.modification_status ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 py-2.5 text-sm">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="font-medium text-amber-700">
            수정 요청 {record.modification_status}
          </span>
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onModifyRequest}
          className="w-full rounded-lg bg-[#f9f9fa] py-2.5 text-sm font-medium text-slate-600 transition-colors active:bg-slate-100"
        >
          수정 요청
        </motion.button>
      )}
    </motion.div>
  );
}

function DayoffSummary({
  dayoffs,
}: {
  dayoffs: DayoffRecord[];
}) {
  return (
    <div className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-3 text-left">
      <span className="min-w-0">
        <span className="block text-xs font-medium text-emerald-700">
          휴가/연차
        </span>
        {dayoffs.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {dayoffs.map((dayoff) => (
              <span
                key={dayoff.id}
                className="rounded bg-white px-2 py-0.5 text-xs font-medium text-emerald-800"
              >
                {dayoff.leave_type?.name || "휴가"}
              </span>
            ))}
          </span>
        ) : (
          <span className="mt-2 block text-xs text-emerald-700">
            이 날짜에 등록된 휴가가 없습니다.
          </span>
        )}
      </span>
    </div>
  );
}
