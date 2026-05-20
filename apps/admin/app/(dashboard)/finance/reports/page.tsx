"use client";

import { useState } from "react";
import { Label } from "@repo/ui/src/label";
import { useFinanceReportSummary } from "@/hooks/useFinance";
import { formatCurrency } from "../_components/finance-format";
import { MonthPicker } from "../_components/FinanceCrudPage";

export default function FinanceReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data, isLoading } = useFinanceReportSummary(month);

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">정산 리포트</h2>
            <p className="text-sm text-slate-500">월별 매출, 비용, 마진과 미수·미지급 현황입니다.</p>
          </div>
          <div className="w-48">
            <Label>조회 월</Label>
            <MonthPicker value={month} onChange={setMonth} placeholder="조회 월 선택" />
          </div>
        </div>
      </section>

      {isLoading || !data ? (
        <div className="rounded-xl bg-white py-20 text-center text-sm text-slate-400">불러오는 중...</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Metric label="총 매출" value={formatCurrency(data.totalRevenue)} />
            <Metric label="입금 완료" value={formatCurrency(data.paidRevenue)} />
            <Metric label="미수금" value={formatCurrency(data.receivable)} />
            <Metric label="총 비용" value={formatCurrency(data.totalExpenses)} />
            <Metric label="미지급금" value={formatCurrency(data.unpaidExpenses)} />
            <Metric label="예상 마진" value={formatCurrency(data.margin)} emphasis={data.margin >= 0 ? "positive" : "negative"} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <ReportTable
              title="고객사별 매출"
              headers={["고객사", "매출"]}
              rows={data.revenueByClient.map((row) => [row.clientName, formatCurrency(row.amount)])}
            />
            <ReportTable
              title="프로젝트별 손익"
              headers={["프로젝트", "매출", "비용", "마진"]}
              rows={data.profitByProject.map((row) => [
                row.projectName,
                formatCurrency(row.revenue),
                formatCurrency(row.expenses),
                formatCurrency(row.margin),
              ])}
            />
          </section>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={emphasis === "negative" ? "mt-1 text-xl font-semibold text-red-600" : "mt-1 text-xl font-semibold text-slate-900"}>
        {value}
      </p>
    </div>
  );
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white">
      <div className="border-b border-slate-100 p-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">데이터가 없습니다.</div>
      ) : (
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-2.5">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="px-4 py-3 text-slate-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
