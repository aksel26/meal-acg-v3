"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Filter } from "lucide-react";
import type { ModifyRequest } from "@/hooks/use-attendance-modify";
import { getAttendanceStatusInfos } from "@/lib/attendance-status";

dayjs.locale("ko");
dayjs.extend(utc);
dayjs.extend(timezone);

interface AttendanceRecord {
  id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_status: string | null;
  check_out_status: string | null;
  attendance_type: string;
  status: string;
  overtime_minutes: number;
  is_weekend: boolean;
  work_minutes: number;
  modification_status: string | null;
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  근무: "bg-slate-100 text-slate-700",
  휴가: "bg-emerald-50 text-emerald-700",
  재택: "bg-amber-50 text-amber-700",
  외근: "bg-blue-50 text-blue-700",
};

const ATTENDANCE_TYPES = ["전체", "근무", "휴가", "재택", "외근"] as const;

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

interface AttendanceTableProps {
  records: AttendanceRecord[];
  modifyRequests?: ModifyRequest[];
  selectedFilter: string;
  onFilterChange: (type: string) => void;
}

export default function AttendanceTable({
  records,
  modifyRequests = [],
  selectedFilter,
  onFilterChange,
}: AttendanceTableProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filteredRecords = useMemo(() => {
    if (selectedFilter === "전체") return records;
    return records.filter(
      (record) => record.attendance_type === selectedFilter,
    );
  }, [records, selectedFilter]);
  const modifyRequestByRecordId = useMemo(() => {
    const requestMap = new Map<string, ModifyRequest>();
    modifyRequests.forEach((request) => {
      const recordId = request.attendance_record_id;
      const previous = requestMap.get(recordId);
      if (!previous || dayjs(request.created_at).isAfter(previous.created_at)) {
        requestMap.set(recordId, request);
      }
    });
    return requestMap;
  }, [modifyRequests]);

  if (records.length === 0) {
    return (
      <div className="rounded-xl bg-white py-12 text-center text-sm text-slate-500">
        출퇴근 기록이 없습니다
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-4 py-3 text-left font-medium text-slate-500">
              날짜
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              출근
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              퇴근
            </th>
            <th className="relative px-2 py-3 text-left font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <span>근태</span>
                <button
                  type="button"
                  onClick={() => setFilterOpen((open) => !open)}
                  className={`rounded-md p-1 transition-colors ${
                    selectedFilter === "전체"
                      ? "text-slate-400 hover:bg-white hover:text-slate-700"
                      : "bg-[#111111] text-white"
                  }`}
                  aria-label="근태 필터"
                >
                  <Filter className="h-3.5 w-3.5" />
                </button>
              </div>
              {filterOpen && (
                <div className="absolute left-2 top-10 z-10 min-w-24 rounded-lg bg-white p-1 shadow-lg ring-1 ring-slate-100">
                  {ATTENDANCE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        onFilterChange(type);
                        setFilterOpen(false);
                      }}
                      className={`block w-full rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                        selectedFilter === type
                          ? "bg-[#111111] text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              현황
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              특이사항
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
          {filteredRecords.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-10 text-center text-sm text-slate-500"
              >
                해당 근태 기록이 없습니다
              </td>
            </tr>
          ) : (
            filteredRecords.map((record) => {
              const d = dayjs(record.date);
              const dayOfWeek = d.day();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const statusInfos = getAttendanceStatusInfos(record);
              const modifyRequest = modifyRequestByRecordId.get(record.id);
              const displayAttendanceType =
                modifyRequest && modifyRequest.approval_status !== "반려"
                  ? modifyRequest.requested_type
                  : record.attendance_type;
              const displayStatuses =
                modifyRequest && modifyRequest.approval_status !== "승인"
                  ? modifyRequest.approval_status === "반려"
                    ? [{ text: "반려", color: "text-rose-600" }]
                    : [{ text: "승인 전", color: "text-amber-600" }]
                  : statusInfos;
              const badgeStyle =
                TYPE_BADGE_STYLES[displayAttendanceType] ||
                TYPE_BADGE_STYLES["근무"];

              return (
                <tr
                  key={record.id}
                  className={`transition-colors hover:bg-[#fafafa] ${
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
                    {formatCheckoutTime(record.check_out_at)}
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badgeStyle}`}
                    >
                      {displayAttendanceType}
                    </span>
                  </td>
                  <td className="px-2 py-3 font-medium">
                    <span className="flex items-center gap-1">
                      {displayStatuses.map((displayStatus, index) => (
                        <span
                          key={displayStatus.text}
                          className={displayStatus.color}
                        >
                          {index > 0 && (
                            <span className="mr-1 text-slate-300">·</span>
                          )}
                          {displayStatus.text}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    {modifyRequest ? (
                      <div className="max-w-[240px] space-y-1">
                        <p className="line-clamp-2 text-[11px] leading-4 text-slate-400">
                          {modifyRequest.reason}
                        </p>
                        {modifyRequest.reject_reason && (
                          <p className="line-clamp-2 text-[11px] leading-4 text-rose-500">
                            반려: {modifyRequest.reject_reason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-slate-700">
                    {formatWorkTime(record.work_minutes)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatWorkTime(record.overtime_minutes)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
