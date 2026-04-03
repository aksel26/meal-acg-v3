"use client";

import dayjs from "dayjs";
import "dayjs/locale/ko";
import { Check, Pencil, Copy, Trash2, Lock } from "lucide-react";
import type { DayoffRecord } from "./types";
import { getLeaveTypeColor, formatLeaveTypeName } from "./types";

dayjs.locale("ko");

interface DayoffsTableProps {
  records: DayoffRecord[];
  onEdit: (record: DayoffRecord) => void;
  onDelete: (record: DayoffRecord) => void;
  onApprove: (record: DayoffRecord) => void;
  onCopy: (record: DayoffRecord) => void;
}

export default function DayoffsTable({
  records,
  onEdit,
  onDelete,
  onApprove,
  onCopy,
}: DayoffsTableProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-[oklch(0.55_0.01_250)]">
        등록된 근태가 없습니다
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
              대상
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              유형
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              사유
            </th>
            <th className="text-center py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              승인
            </th>
            <th className="text-right py-3 px-4 font-medium text-[oklch(0.50_0.01_250)]">
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
                className="border-b border-[oklch(0.95_0.01_250)] hover:bg-[oklch(0.97_0.01_250)] transition-colors"
              >
                <td className="py-3 px-4">
                  <span
                    className={
                      dayOfWeek === 0
                        ? "text-red-400"
                        : dayOfWeek === 6
                          ? "text-blue-400"
                          : "text-[oklch(0.30_0.02_250)]"
                    }
                  >
                    {d.format("MM-DD")} ({d.format("dd")})
                  </span>
                </td>
                <td className="py-3 px-2 text-[oklch(0.30_0.02_250)]">
                  {record.target?.full_name || "-"}
                </td>
                <td className="py-3 px-2">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: color.badge,
                      color: color.text,
                    }}
                  >
                    {typeName}
                  </span>
                </td>
                <td className="py-3 px-2 text-[oklch(0.55_0.01_250)] max-w-[120px] truncate">
                  {record.reason || "-"}
                </td>
                <td className="py-3 px-2 text-center">
                  {isApproved ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium bg-[oklch(0.93_0.04_150)] text-[oklch(0.40_0.12_150)]">
                      <Lock className="h-2.5 w-2.5" />
                      승인
                    </span>
                  ) : (
                    <span className="text-xs text-[oklch(0.55_0.01_250)]">
                      대기
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-0.5">
                    {!isApproved && (
                      <>
                        <button
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[oklch(0.93_0.04_150)] text-[oklch(0.45_0.12_150)] transition-colors"
                          onClick={() => onApprove(record)}
                          title="승인"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[oklch(0.96_0.01_250)] text-[oklch(0.50_0.01_250)] transition-colors"
                          onClick={() => onEdit(record)}
                          title="수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[oklch(0.96_0.01_250)] text-[oklch(0.50_0.01_250)] transition-colors"
                          onClick={() => onCopy(record)}
                          title="복사"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[oklch(0.93_0.04_25)] text-[oklch(0.55_0.20_25)] transition-colors"
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
