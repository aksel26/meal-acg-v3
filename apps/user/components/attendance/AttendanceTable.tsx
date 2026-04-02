"use client";

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
  is_weekend: boolean;
  work_minutes: number;
  modification_status: string | null;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  normal: { text: "정상", color: "text-[oklch(0.45_0.12_150)]" },
  late: { text: "지각", color: "text-[oklch(0.55_0.20_25)]" },
  early_leave: { text: "조퇴", color: "text-[oklch(0.55_0.15_60)]" },
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  근무: "bg-[oklch(0.93_0.04_250)] text-[oklch(0.45_0.12_250)]",
  휴가: "bg-[oklch(0.93_0.04_150)] text-[oklch(0.40_0.12_150)]",
  재택: "bg-[oklch(0.93_0.04_60)] text-[oklch(0.45_0.12_60)]",
  외근: "bg-[oklch(0.93_0.04_310)] text-[oklch(0.45_0.12_310)]",
};

function formatTime(isoString: string | null): string {
  if (!isoString) return "-";
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm");
}

function formatWorkTime(minutes: number): string {
  if (minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onRowClick: (record: AttendanceRecord) => void;
}

export default function AttendanceTable({
  records,
  onRowClick,
}: AttendanceTableProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-[oklch(0.55_0.01_250)]">
        출퇴근 기록이 없습니다
      </div>
    );
  }

  return (
    <div className="card-premium rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[oklch(0.92_0.01_250)]">
            <th className="text-left py-3 px-4 font-medium text-[oklch(0.50_0.01_250)]">
              날짜
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              요일
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              출근
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              퇴근
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              근태
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              현황
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              근무
            </th>
            <th className="text-right py-3 px-4 font-medium text-[oklch(0.50_0.01_250)]">
              초과
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const d = dayjs(record.date);
            const dayOfWeek = d.day();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const statusInfo =
              STATUS_LABELS[record.status] || STATUS_LABELS["normal"];
            const badgeStyle =
              TYPE_BADGE_STYLES[record.attendance_type] ||
              TYPE_BADGE_STYLES["근무"];

            return (
              <tr
                key={record.id}
                onClick={() => onRowClick(record)}
                className={`border-b border-[oklch(0.95_0.01_250)] cursor-pointer hover:bg-[oklch(0.97_0.01_250)] transition-colors ${
                  isWeekend ? "bg-[oklch(0.98_0.005_250)]" : ""
                }`}
              >
                <td className="py-3 px-4 text-[oklch(0.30_0.02_250)]">
                  <div className="flex items-center gap-1.5">
                    {record.modification_status && (
                      <span className="w-2 h-2 rounded-full bg-[oklch(0.65_0.15_60)] shrink-0" />
                    )}
                    {d.format("MM-DD")}
                  </div>
                </td>
                <td
                  className={`py-3 px-2 ${
                    dayOfWeek === 0
                      ? "text-red-400"
                      : dayOfWeek === 6
                        ? "text-blue-400"
                        : "text-[oklch(0.45_0.02_250)]"
                  }`}
                >
                  {d.format("dd")}
                </td>
                <td className="py-3 px-2 text-[oklch(0.30_0.02_250)]">
                  {formatTime(record.check_in_at)}
                </td>
                <td className="py-3 px-2 text-[oklch(0.30_0.02_250)]">
                  {formatTime(record.check_out_at)}
                </td>
                <td className="py-3 px-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badgeStyle}`}
                  >
                    {record.attendance_type}
                  </span>
                </td>
                <td className={`py-3 px-2 font-medium ${statusInfo.color}`}>
                  {statusInfo.text}
                </td>
                <td className="py-3 px-2 text-[oklch(0.30_0.02_250)]">
                  {formatWorkTime(record.work_minutes)}
                </td>
                <td className="py-3 px-4 text-right text-[oklch(0.30_0.02_250)]">
                  {formatWorkTime(record.overtime_minutes)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
