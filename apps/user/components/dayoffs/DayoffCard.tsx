"use client";

import { motion } from "motion/react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { Pencil, Copy, Trash2, Lock, Plus } from "lucide-react";
import type { DayoffRecord } from "./types";
import { getLeaveTypeColor, formatLeaveTypeName } from "./types";

dayjs.locale("ko");

interface DayoffCardProps {
  selectedDate: string;
  records: DayoffRecord[];
  onEdit: (record: DayoffRecord) => void;
  onDelete: (record: DayoffRecord) => void;
  onCopy: (record: DayoffRecord) => void;
  onCreateNew: (date: string) => void;
}

export default function DayoffCard({
  selectedDate,
  records,
  onEdit,
  onDelete,
  onCopy,
  onCreateNew,
}: DayoffCardProps) {
  const d = dayjs(selectedDate);
  const dateLabel = `${d.format("M월 D일")} (${d.format("dd")})`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl border border-[#f3f3f3] bg-white p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-semibold text-[#111111]">{dateLabel}</span>
        {records.length > 0 && (
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {records.length}건
          </span>
        )}
      </div>

      {records.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          등록된 근태가 없습니다
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const isApproved = !!record.approver_id;
            const color = getLeaveTypeColor(record.leave_type?.category);
            const typeName = formatLeaveTypeName(record);

            return (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-xl bg-[#f9f9fa] px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="shrink-0 rounded px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: color.badge,
                      color: color.text,
                    }}
                  >
                    {typeName}
                  </span>
                  <span className="truncate text-sm text-[#111111]">
                    {record.target?.full_name}
                  </span>
                  {record.reason && (
                    <span className="hidden truncate text-xs text-slate-500 sm:inline">
                      {record.reason}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {isApproved ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <Lock className="h-2.5 w-2.5" />
                      승인
                    </span>
                  ) : (
                    <>
                      <button
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white"
                        onClick={() => onEdit(record)}
                        title="수정"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white"
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
              </div>
            );
          })}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onCreateNew(selectedDate)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#111111] py-2.5 text-sm font-medium text-white hover:bg-[#222222]"
      >
        <Plus className="h-4 w-4" />
        휴가 신청
      </motion.button>
    </motion.div>
  );
}
