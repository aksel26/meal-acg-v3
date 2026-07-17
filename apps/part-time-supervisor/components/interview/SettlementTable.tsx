"use client";

import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/cost-utils";
import { SettlementExpandedRow } from "./SettlementExpandedRow";

type SettlementPersonnel = {
  id: string;
  name: string;
  role: "rp" | "ft" | "instructor";
  pay_type: "hourly" | "daily" | "contract";
  amount: number;
  work_days: number | null;
  work_hours: number | null;
  details: {
    id: string;
    work_date: string;
    work_hours: number;
    pay_rate: number;
    pay_type: "hourly" | "daily";
    amount: number;
    is_overridden: boolean;
    note: string | null;
    job_posting_id: string | null;
    job_posting_title: string | null;
  }[];
  assignments?: {
    job_posting_id: string;
    job_posting_title: string;
  }[];
};

type Props = {
  personnel: SettlementPersonnel[];
  isLoading: boolean;
  isLocked?: boolean;
};

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  rp: { label: "RP", className: "bg-blue-50 text-blue-700" },
  ft: { label: "FT", className: "bg-emerald-50 text-emerald-700" },
  instructor: { label: "강사", className: "bg-purple-50 text-purple-700" },
};

const PAY_TYPE_LABELS: Record<string, string> = {
  hourly: "시급",
  daily: "일급",
  contract: "계약금",
};

export function SettlementTable({ personnel, isLoading, isLocked: _isLocked = false }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        불러오는 중...
      </div>
    );
  }

  if (personnel.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        해당 월에 정산 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
            <th className="w-8 px-3 py-2 font-medium"></th>
            <th className="px-3 py-2 font-medium">이름</th>
            <th className="px-3 py-2 font-medium">역할</th>
            <th className="px-3 py-2 font-medium">급여유형</th>
            <th className="px-3 py-2 font-medium text-right">근무일수</th>
            <th className="px-3 py-2 font-medium text-right">산정금액</th>
          </tr>
        </thead>
        <tbody>
          {personnel.map((p) => {
            const isRp = p.role === "rp";
            const isExpanded = expandedId === p.id;
            const roleInfo = ROLE_LABELS[p.role];

            return (
              <Fragment key={p.id}>
                <tr
                  className={`border-b border-slate-100 last:border-b-0 transition-colors ${
                    isRp
                      ? "cursor-pointer hover:bg-slate-50"
                      : ""
                  }`}
                  onClick={() => {
                    if (isRp) setExpandedId(isExpanded ? null : p.id);
                  }}
                >
                  <td className="px-3 py-3 text-slate-400">
                    {isRp ? (
                      <span
                        className={`inline-block transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        <ChevronRight size={16} />
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-3 py-3">
                    {roleInfo && (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleInfo.className}`}
                      >
                        {roleInfo.label}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {PAY_TYPE_LABELS[p.pay_type] ?? "-"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                    {isRp && p.work_days != null ? `${p.work_days}일` : "-"}
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-800">
                    {formatCurrency(p.amount)}
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
                          <SettlementExpandedRow details={p.details} />
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
  );
}
