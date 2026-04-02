"use client";

import { motion } from "motion/react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

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
  근무: "bg-[oklch(0.93_0.04_250)] text-[oklch(0.45_0.12_250)]",
  휴가: "bg-[oklch(0.93_0.04_150)] text-[oklch(0.40_0.12_150)]",
  재택: "bg-[oklch(0.93_0.04_60)] text-[oklch(0.45_0.12_60)]",
  외근: "bg-[oklch(0.93_0.04_310)] text-[oklch(0.45_0.12_310)]",
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  normal: { text: "정상", color: "text-[oklch(0.45_0.12_150)]" },
  late: { text: "지각", color: "text-[oklch(0.55_0.20_25)]" },
  early_leave: { text: "조퇴", color: "text-[oklch(0.55_0.15_60)]" },
};

function formatTime(isoString: string | null): string {
  if (!isoString) return "-";
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm");
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
  onModifyRequest: () => void;
}

export default function AttendanceCard({
  selectedDate,
  record,
  onModifyRequest,
}: AttendanceCardProps) {
  const d = dayjs(selectedDate);
  const dateLabel = `${d.format("M월 D일")} (${d.format("dd")})`;

  if (!record) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium rounded-2xl p-5 mt-4"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-[oklch(0.25_0.02_250)]">
            {dateLabel}
          </span>
        </div>
        <p className="text-center text-sm text-[oklch(0.55_0.01_250)] py-6">
          출퇴근 기록이 없습니다
        </p>
      </motion.div>
    );
  }

  const badgeStyle =
    TYPE_BADGE_STYLES[record.attendance_type] || TYPE_BADGE_STYLES["근무"];
  const statusInfo = STATUS_LABELS[record.status] || STATUS_LABELS["normal"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium rounded-2xl p-5 mt-4"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold text-[oklch(0.25_0.02_250)]">
          {dateLabel}
        </span>
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${badgeStyle}`}
        >
          {record.attendance_type}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4 px-3 py-3 rounded-xl bg-[oklch(0.97_0.01_250)]">
        <div className="flex-1 text-center">
          <p className="text-xs text-[oklch(0.55_0.01_250)] mb-0.5">출근</p>
          <p className="text-lg font-semibold text-[oklch(0.30_0.02_250)]">
            {formatTime(record.check_in_at)}
          </p>
        </div>
        <div className="w-px h-8 bg-[oklch(0.90_0.01_250)]" />
        <div className="flex-1 text-center">
          <p className="text-xs text-[oklch(0.55_0.01_250)] mb-0.5">퇴근</p>
          <p className="text-lg font-semibold text-[oklch(0.30_0.02_250)]">
            {formatTime(record.check_out_at)}
          </p>
        </div>
      </div>

      <div className="space-y-2.5 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[oklch(0.55_0.01_250)]">출근현황</span>
          <span className={`text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[oklch(0.55_0.01_250)]">근무시간</span>
          <span className="text-sm font-medium text-[oklch(0.30_0.02_250)]">
            {formatWorkTime(record.work_minutes)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[oklch(0.55_0.01_250)]">초과시간</span>
          <span className="text-sm font-medium text-[oklch(0.30_0.02_250)]">
            {formatWorkTime(record.overtime_minutes)}
          </span>
        </div>
      </div>

      {record.modification_status ? (
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[oklch(0.96_0.03_60)] text-sm">
          <span className="w-2 h-2 rounded-full bg-[oklch(0.65_0.15_60)]" />
          <span className="text-[oklch(0.45_0.10_60)] font-medium">
            수정 요청 {record.modification_status}
          </span>
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onModifyRequest}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-[oklch(0.45_0.02_250)] bg-[oklch(0.96_0.01_250)] border border-[oklch(0.90_0.02_250)] active:bg-[oklch(0.93_0.01_250)] transition-colors"
        >
          수정 요청
        </motion.button>
      )}
    </motion.div>
  );
}
