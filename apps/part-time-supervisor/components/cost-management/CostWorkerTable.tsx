"use client";

import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/cost-utils";
import type { CostWorkerData, CostPostingDetail } from "@/hooks/use-cost-management";
import { CostWorkerExpandedRow } from "./CostWorkerExpandedRow";
import { WorkRecordEditModal } from "./WorkRecordEditModal";

type Props = {
  workers: CostWorkerData[];
  isLoading: boolean;
  isLocked?: boolean;
};

export function CostWorkerTable({ workers, isLoading, isLocked = false }: Props) {
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [editingPosting, setEditingPosting] = useState<CostPostingDetail | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        불러오는 중...
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        해당 월에 근무 기록이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-200 text-left text-slate-600 [&>th:first-child]:rounded-tl-md [&>th:last-child]:rounded-tr-md">
              <th className="px-4 py-3 font-medium w-8"></th>
              <th className="px-4 py-3 font-medium">지원자명</th>
              <th className="px-4 py-3 font-medium text-right">참여 공고</th>
              <th className="px-4 py-3 font-medium text-right">근무 일수</th>
              <th className="px-4 py-3 font-medium text-right">총 근무 시간</th>
              <th className="px-4 py-3 font-medium text-right">산정 금액</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => {
              const isExpanded = expandedWorker === w.workerId;
              return (
                <Fragment key={w.workerId}>
                  <tr
                    className="cursor-pointer border-b transition-colors duration-150 hover:bg-slate-50 active:bg-slate-100"
                    onClick={() => setExpandedWorker(isExpanded ? null : w.workerId)}
                  >
                    <td className="px-4 py-3 text-slate-400">
                      <span className={`inline-block transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                        <ChevronRight size={16} />
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{w.workerName}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{w.postingCount}건</td>
                    <td className="px-4 py-3 text-right text-slate-600">{w.totalWorkDays}일</td>
                    <td className="px-4 py-3 text-right text-slate-600">{w.totalWorkHours}h</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(w.totalAmount)}
                    </td>
                  </tr>
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <CostWorkerExpandedRow
                              postings={w.postings}
                              onEditClick={setEditingPosting}
                              isLocked={isLocked}
                            />
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingPosting && (
        <WorkRecordEditModal
          assignmentId={editingPosting.assignmentId}
          currentPayRate={editingPosting.effectivePayRate}
          currentPayType={editingPosting.payType}
          isOverridden={editingPosting.isOverridden}
          onClose={() => setEditingPosting(null)}
        />
      )}
    </>
  );
}
