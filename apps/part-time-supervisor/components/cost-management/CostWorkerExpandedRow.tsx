"use client";

import { formatCurrency } from "@/lib/cost-utils";
import type { CostPostingDetail } from "@/hooks/use-cost-management";

type Props = {
  postings: CostPostingDetail[];
  onEditClick: (posting: CostPostingDetail) => void;
  isLocked?: boolean;
};

export function CostWorkerExpandedRow({ postings, onEditClick, isLocked = false }: Props) {
  return (
    <div className="bg-slate-50 px-6 py-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
            <th className="px-3 py-2 font-medium">공고명</th>
            <th className="px-3 py-2 font-medium">기간</th>
            <th className="px-3 py-2 font-medium">급여 타입</th>
            <th className="px-3 py-2 font-medium text-right">단가</th>
            <th className="px-3 py-2 font-medium text-right">근무 일수</th>
            <th className="px-3 py-2 font-medium text-right">총 시간</th>
            <th className="px-3 py-2 font-medium text-right">소계</th>
            <th className="px-3 py-2 font-medium text-right">수정</th>
          </tr>
        </thead>
        <tbody>
          {postings.map((p) => (
            <tr key={p.assignmentId} className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50">
              <td className="px-3 py-3 font-medium text-slate-800">{p.jobPostingTitle}</td>
              <td className="px-3 py-3 text-slate-600">
                {p.startDate.slice(5)} ~ {p.endDate.slice(5)}
              </td>
              <td className="px-3 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  p.payType === "hourly" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                }`}>
                  {p.payType === "hourly" ? "시급" : "일급"}
                </span>
                {p.isOverridden && (
                  <span className="ml-1 text-xs text-orange-500">커스텀</span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                {formatCurrency(p.effectivePayRate)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-slate-600">{p.workDays}일</td>
              <td className="px-3 py-3 text-right tabular-nums text-slate-600">{p.totalHours}h</td>
              <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-800">
                {formatCurrency(p.subtotal)}
              </td>
              <td className="px-3 py-3 text-right">
                <button
                  onClick={() => onEditClick(p)}
                  disabled={isLocked}
                  className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  수정
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
