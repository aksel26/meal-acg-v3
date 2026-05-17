"use client";

import dayjs from "dayjs";
import "dayjs/locale/ko";
import { Pencil, Copy, Trash2, Lock } from "lucide-react";
import type { DayoffRecord } from "./types";
import { getLeaveTypeColor, formatLeaveTypeName } from "./types";

dayjs.locale("ko");

interface DayoffsTableProps {
  records: DayoffRecord[];
  onEdit: (record: DayoffRecord) => void;
  onDelete: (record: DayoffRecord) => void;
  onCopy: (record: DayoffRecord) => void;
}

export default function DayoffsTable({
  records,
  onEdit,
  onDelete,
  onCopy,
}: DayoffsTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-[#f3f3f3] bg-white py-12 text-center text-sm text-slate-500">
        등록된 근태가 없습니다
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
              대상
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              유형
            </th>
            <th className="px-2 py-3 text-left font-medium text-slate-500">
              사유
            </th>
            <th className="px-2 py-3 text-center font-medium text-slate-500">
              승인
            </th>
            <th className="px-4 py-3 text-right font-medium text-slate-500">
              액션
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const d = dayjs(record.leave_date);
            const dayOfWeek = d.day();
            const isApproved = !!record.approver_id;
            const color = getLeaveTypeColor(record.leave_type?.category);
            const typeName = formatLeaveTypeName(record);

            return (
              <tr
                key={record.id}
                className="border-b border-[#f3f3f3] transition-colors hover:bg-[#fafafa]"
              >
                <td className="px-4 py-3">
                  <span
                    className={
                      dayOfWeek === 0
                        ? "text-red-400"
                        : dayOfWeek === 6
                          ? "text-blue-400"
                          : "text-slate-700"
                    }
                  >
                    {d.format("MM-DD")} ({d.format("dd")})
                  </span>
                </td>
                <td className="px-2 py-3 text-slate-700">
                  {record.target?.full_name || "-"}
                </td>
                <td className="px-2 py-3">
                  <span
                    className="inline-block rounded px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: color.badge,
                      color: color.text,
                    }}
                  >
                    {typeName}
                  </span>
                </td>
                <td className="max-w-[120px] truncate px-2 py-3 text-slate-500">
                  {record.reason || "-"}
                </td>
                <td className="px-2 py-3 text-center">
                  {isApproved ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <Lock className="h-2.5 w-2.5" />
                      승인
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">대기</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-0.5">
                    {!isApproved && (
                      <>
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#f9f9fa]"
                          onClick={() => onEdit(record)}
                          title="수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#f9f9fa]"
                          onClick={() => onCopy(record)}
                          title="복사"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rose-600 transition-colors hover:bg-rose-50"
                          onClick={() => onDelete(record)}
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
