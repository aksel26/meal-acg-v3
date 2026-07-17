"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/cost-utils";

type Detail = {
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
};

type Props = {
  details: Detail[];
};

export function SettlementExpandedRow({ details }: Props) {
  return (
    <div className="bg-slate-50 px-6 py-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
            <th className="px-3 py-2 font-medium">날짜</th>
            <th className="px-3 py-2 font-medium">공고</th>
            <th className="px-3 py-2 font-medium">근무시간</th>
            <th className="px-3 py-2 font-medium">급여타입</th>
            <th className="px-3 py-2 font-medium text-right">단가</th>
            <th className="px-3 py-2 font-medium text-right">금액</th>
            <th className="px-3 py-2 font-medium">비고</th>
          </tr>
        </thead>
        <tbody>
          {details.map((d) => (
            <tr key={d.id} className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50">
              <td className="px-3 py-3 font-medium tabular-nums text-slate-800">{d.work_date}</td>
              <td className="px-3 py-3">
                {d.job_posting_id && d.job_posting_title ? (
                  <Link
                    href={`/interview/job-postings/${d.job_posting_id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {d.job_posting_title}
                  </Link>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
              <td className="px-3 py-3 tabular-nums text-slate-600">{d.work_hours}h</td>
              <td className="px-3 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    d.pay_type === "hourly"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {d.pay_type === "hourly" ? "시급" : "일급"}
                </span>
                {d.is_overridden && (
                  <span className="ml-1 text-xs text-orange-500">커스텀</span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                {formatCurrency(d.pay_rate)}
              </td>
              <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-800">
                {formatCurrency(d.amount)}
              </td>
              <td className="px-3 py-3 text-slate-600">{d.note ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
