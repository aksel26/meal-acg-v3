"use client";

import { FinanceCrudPage } from "../_components/FinanceCrudPage";
import { formatCurrency, statusBadgeClass, statusLabel } from "../_components/finance-format";
import {
  useFinanceClients,
  useFinanceMutation,
  useFinanceProjects,
  useFinanceQuotes,
  useFinanceRevenue,
  type FinanceRevenue,
} from "@/hooks/useFinance";

export default function FinanceRevenuePage() {
  const { data = [], isLoading } = useFinanceRevenue();
  const { data: clients = [] } = useFinanceClients();
  const { data: projects = [] } = useFinanceProjects();
  const { data: quotes = [] } = useFinanceQuotes();
  const mutations = useFinanceMutation("revenue");

  return (
    <FinanceCrudPage<FinanceRevenue>
      title="매출"
      description="월별 매출 예정/확정, 세금계산서 발행, 입금 상태를 관리합니다."
      items={data}
      isLoading={isLoading}
      defaultValues={{
        client_id: "",
        project_id: "",
        quote_id: "",
        revenue_month: new Date().toISOString().slice(0, 7),
        revenue_date: "",
        amount: "0",
        tax_invoice_status: "none",
        expected_payment_date: "",
        status: "expected",
        memo: "",
      }}
      fields={[
        { key: "client_id", label: "고객사", type: "select", required: true, options: clients.map((client) => ({ value: client.id, label: client.name })) },
        { key: "project_id", label: "프로젝트", type: "select", options: projects.map((project) => ({ value: project.id, label: project.name })) },
        { key: "quote_id", label: "견적서", type: "select", options: quotes.map((quote) => ({ value: quote.id, label: quote.quote_no })) },
        { key: "revenue_month", label: "매출월", type: "month", required: true },
        { key: "revenue_date", label: "매출일", type: "date" },
        { key: "amount", label: "금액", type: "number" },
        {
          key: "tax_invoice_status",
          label: "세금계산서",
          type: "select",
          required: true,
          options: [
            { value: "none", label: "없음" },
            { value: "scheduled", label: "예정" },
            { value: "issued", label: "발행" },
          ],
        },
        { key: "expected_payment_date", label: "입금 예정일", type: "date" },
        {
          key: "status",
          label: "상태",
          type: "select",
          required: true,
          options: [
            { value: "expected", label: "예정" },
            { value: "invoiced", label: "계산서 발행" },
            { value: "paid", label: "입금 완료" },
            { value: "overdue", label: "미수" },
            { value: "canceled", label: "취소" },
          ],
        },
        { key: "memo", label: "메모", type: "textarea", className: "md:col-span-2" },
      ]}
      columns={[
        { key: "revenue_month", label: "매출월" },
        { key: "client", label: "고객사", render: (item) => item.client?.name || "-" },
        { key: "project", label: "프로젝트", render: (item) => item.project?.name || "-" },
        { key: "amount", label: "금액", render: (item) => formatCurrency(item.amount) },
        { key: "tax_invoice_status", label: "세금계산서", render: (item) => statusLabel(item.tax_invoice_status) },
        { key: "expected_payment_date", label: "입금 예정일", render: (item) => item.expected_payment_date || "-" },
        {
          key: "status",
          label: "상태",
          render: (item) => <span className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</span>,
        },
      ]}
      searchPlaceholder="고객사, 프로젝트, 견적번호 검색"
      onCreate={(payload) => mutations.create.mutate(payload)}
      onUpdate={(id, payload) => mutations.update.mutate({ id, payload })}
      onDelete={(id) => mutations.remove.mutate(id)}
    />
  );
}
