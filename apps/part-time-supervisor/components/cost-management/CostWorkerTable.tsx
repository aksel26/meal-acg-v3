"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/cost-utils";
import type { CostWorkerData, CostPostingDetail } from "@/hooks/use-cost-management";
import { CostWorkerExpandedRow } from "./CostWorkerExpandedRow";
import { WorkRecordEditModal } from "./WorkRecordEditModal";

type Props = {
  workers: CostWorkerData[];
  isLoading: boolean;
};

export function CostWorkerTable({ workers, isLoading }: Props) {
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
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-slate-500">
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
                    className="cursor-pointer border-b hover:bg-slate-50"
                    onClick={() => setExpandedWorker(isExpanded ? null : w.workerId)}
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{w.workerName}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{w.postingCount}건</td>
                    <td className="px-4 py-3 text-right text-slate-600">{w.totalWorkDays}일</td>
                    <td className="px-4 py-3 text-right text-slate-600">{w.totalWorkHours}h</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(w.totalAmount)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <CostWorkerExpandedRow
                          postings={w.postings}
                          onEditClick={setEditingPosting}
                        />
                      </td>
                    </tr>
                  )}
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
