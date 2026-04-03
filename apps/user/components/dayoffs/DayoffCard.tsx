"use client";

import { motion } from "motion/react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { Check, Pencil, Copy, Trash2, Lock, Plus } from "lucide-react";
import type { DayoffRecord } from "./types";
import { getLeaveTypeColor, formatLeaveTypeName } from "./types";

dayjs.locale("ko");

interface DayoffCardProps {
  selectedDate: string;
  records: DayoffRecord[];
  onEdit: (record: DayoffRecord) => void;
  onDelete: (record: DayoffRecord) => void;
  onApprove: (record: DayoffRecord) => void;
  onCopy: (record: DayoffRecord) => void;
  onCreateNew: (date: string) => void;
}

export default function DayoffCard({
  selectedDate,
  records,
  onEdit,
  onDelete,
  onApprove,
  onCopy,
  onCreateNew,
}: DayoffCardProps) {
  const d = dayjs(selectedDate);
  const dateLabel = `${d.format("M월 D일")} (${d.format("dd")})`;

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
        {records.length > 0 && (
          <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-[oklch(0.93_0.04_250)] text-[oklch(0.45_0.12_250)]">
            {records.length}건
          </span>
        )}
      </div>

      {records.length === 0 ? (
        <p className="text-center text-sm text-[oklch(0.55_0.01_250)] py-6">
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
                className="flex items-center justify-between px-3 py-3 rounded-xl bg-[oklch(0.97_0.01_250)]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="shrink-0 px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: color.badge,
                      color: color.text,
                    }}
                  >
                    {typeName}
                  </span>
                  <span className="text-sm text-[oklch(0.30_0.02_250)] truncate">
                    {record.target?.full_name}
                  </span>
                  {record.reason && (
                    <span className="text-xs text-[oklch(0.55_0.01_250)] truncate hidden sm:inline">
                      {record.reason}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {isApproved ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium bg-[oklch(0.93_0.04_150)] text-[oklch(0.40_0.12_150)]">
                      <Lock className="h-2.5 w-2.5" />
                      승인
                    </span>
                  ) : (
                    <>
                      <button
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[oklch(0.93_0.04_150)] text-[oklch(0.45_0.12_150)] transition-colors"
                        onClick={() => onApprove(record)}
                        title="승인"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-white text-[oklch(0.50_0.01_250)] transition-colors"
                        onClick={() => onEdit(record)}
                        title="수정"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-white text-[oklch(0.50_0.01_250)] transition-colors"
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
              </div>
            );
          })}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onCreateNew(selectedDate)}
        className="w-full mt-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#131313] hover:bg-[#2a2a2a] flex items-center justify-center gap-1.5"
      >
        <Plus className="h-4 w-4" />
        휴가 신청
      </motion.button>
    </motion.div>
  );
}
