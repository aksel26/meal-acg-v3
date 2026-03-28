"use client";

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
  job_posting_title: string | null;
};

type Props = {
  details: Detail[];
};

export function SettlementExpandedRow({ details }: Props) {
  return (
    <div className="bg-slate-50 px-6 py-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="pb-2 font-medium">날짜</th>
            <th className="pb-2 font-medium">공고</th>
            <th className="pb-2 font-medium">근무시간</th>
            <th className="pb-2 font-medium">급여타입</th>
            <th className="pb-2 font-medium text-right">단가</th>
            <th className="pb-2 font-medium text-right">금액</th>
            <th className="pb-2 font-medium">비고</th>
          </tr>
        </thead>
        <tbody>
          {details.map((d) => (
            <tr key={d.id} className="border-b last:border-0">
              <td className="py-2.5 text-slate-900">{d.work_date}</td>
              <td className="py-2.5 text-slate-600">
                {d.job_posting_title ?? "-"}
              </td>
              <td className="py-2.5 text-slate-600">{d.work_hours}h</td>
              <td className="py-2.5">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
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
              <td className="py-2.5 text-right text-slate-900">
                {formatCurrency(d.pay_rate)}
              </td>
              <td className="py-2.5 text-right font-medium text-slate-900">
                {formatCurrency(d.amount)}
              </td>
              <td className="py-2.5 text-slate-500">{d.note ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
