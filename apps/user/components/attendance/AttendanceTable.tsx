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
  normal: { text: "정상", color: "text-emerald-600" },
  late: { text: "지각", color: "text-rose-600" },
  early_leave: { text: "조퇴", color: "text-amber-600" },
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  근무: "bg-slate-100 text-slate-700",
  휴가: "bg-emerald-50 text-emerald-700",
  재택: "bg-amber-50 text-amber-700",
  외근: "bg-violet-50 text-violet-700",
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
      <div className="rounded-xl border border-[#f3f3f3] bg-white py-12 text-center text-sm text-slate-500">
        출퇴근 기록이 없습니다
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#f3f3f3] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#f3f3f3] bg-[#f9f9fa]">
            <th className="px-4 py-3 text-left font-medium text-slate-500">
              날짜
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              출근
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              퇴근
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              근태
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              현황
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              근무
            </th>
            <th className="px-4 py-3 text-right font-medium text-slate-500">
              초과
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const d = dayjs(record.date);
            const dayOfWeek = d.day();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const DEFAULT_STATUS = {
              text: "정상",
              color: "text-emerald-600",
            };
            const statusInfo = STATUS_LABELS[record.status] ?? DEFAULT_STATUS;
            const badgeStyle =
              TYPE_BADGE_STYLES[record.attendance_type] ||
              TYPE_BADGE_STYLES["근무"];

            return (
              <tr
                key={record.id}
                onClick={() => onRowClick(record)}
                className={`cursor-pointer border-b border-[#f3f3f3] transition-colors hover:bg-[#fafafa] ${
                  isWeekend ? "bg-[#fcfcfd]" : ""
                }`}
              >
                <td className="px-4 py-3 text-slate-700">
                  <div className="flex items-center gap-1.5">
                    {record.modification_status && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    )}
                    <span
                      className={
                        dayOfWeek === 0
                          ? "text-red-400"
                          : dayOfWeek === 6
                            ? "text-blue-400"
                            : ""
                      }
                    >
                      {d.format("MM-DD")} ({d.format("dd")})
                    </span>
                  </div>
                </td>
                <td className="px-2 py-3 text-slate-700">
                  {formatTime(record.check_in_at)}
                </td>
                <td className="px-2 py-3 text-slate-700">
                  {formatTime(record.check_out_at)}
                </td>
                <td className="px-2 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badgeStyle}`}
                  >
                    {record.attendance_type}
                  </span>
                </td>
                <td className={`px-2 py-3 font-medium ${statusInfo.color}`}>
                  {statusInfo.text}
                </td>
                <td className="px-2 py-3 text-slate-700">
                  {formatWorkTime(record.work_minutes)}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
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
