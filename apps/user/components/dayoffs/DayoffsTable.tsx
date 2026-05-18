"use client";

import dayjs from "dayjs";
import "dayjs/locale/ko";
import { Lock, Pencil, Trash2 } from "lucide-react";
import type { DayoffRecord } from "./types";
import { formatLeaveTypeName, getLeaveTypeColor } from "./types";

dayjs.locale("ko");

interface DayoffsTableProps {
  records: DayoffRecord[];
  onEdit: (record: DayoffRecord) => void;
  onDelete: (record: DayoffRecord) => void;
}

export default function DayoffsTable({
  records,
  onEdit,
  onDelete,
}: DayoffsTableProps) {
  if (records.length === 0) {
    return (
      <div className="bg-slate-50 py-12 text-center text-sm text-slate-500">
        등록된 근태가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {records.map((record) => {
        const date = dayjs(record.leave_date);
        const dayOfWeek = date.day();
        const isApproved = Boolean(record.approver_id);
        const color = getLeaveTypeColor(record.leave_type?.category);
        const typeName = formatLeaveTypeName(record);

        return (
          <article
            key={record.id}
            className="flex items-center gap-3 rounded-xl bg-slate-50/80 px-3 py-3 transition-colors hover:bg-slate-100"
          >
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-center">
              <p
                className={
                  dayOfWeek === 0
                    ? "text-lg font-semibold leading-none text-red-400"
                    : dayOfWeek === 6
                      ? "text-lg font-semibold leading-none text-blue-400"
                      : "text-lg font-semibold leading-none text-[#111111]"
                }
              >
                {date.format("DD")}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-400">
                {date.format("M월 dd")}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: color.badge,
                    color: color.text,
                  }}
                >
                  {typeName}
                </span>
                {isApproved ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <Lock className="h-2.5 w-2.5" />
                    승인
                  </span>
                ) : (
                  <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    승인대기
                  </span>
                )}
              </div>
              <p className="mt-1.5 truncate text-sm text-slate-500">
                {record.reason || "사유 없음"}
              </p>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1">
              {!isApproved && (
                <>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 transition-colors hover:text-[#111111]"
                    onClick={() => onEdit(record)}
                    title="수정"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => onDelete(record)}
                    title="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
