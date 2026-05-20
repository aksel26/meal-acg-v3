"use client";

import { FinanceCrudPage } from "../_components/FinanceCrudPage";
import { statusBadgeClass, statusLabel } from "../_components/finance-format";
import { useFinanceClients, useFinanceMutation, type FinanceClient } from "@/hooks/useFinance";

export default function FinanceClientsPage() {
  const { data = [], isLoading } = useFinanceClients();
  const mutations = useFinanceMutation("clients");

  return (
    <FinanceCrudPage<FinanceClient>
      title="고객사"
      description="고객사 기본 정보, 담당자, 결제 조건을 관리합니다."
      items={data}
      isLoading={isLoading}
      defaultValues={{
        name: "",
        business_registration_number: "",
        representative_name: "",
        contact_name: "",
        contact_phone: "",
        contact_email: "",
        payment_terms: "",
        status: "active",
        memo: "",
      }}
      fields={[
        { key: "name", label: "고객사명", required: true, className: "md:col-span-2" },
        { key: "business_registration_number", label: "사업자등록번호" },
        { key: "representative_name", label: "대표자명" },
        { key: "contact_name", label: "담당자" },
        { key: "contact_phone", label: "연락처" },
        { key: "contact_email", label: "이메일" },
        { key: "payment_terms", label: "결제 조건" },
        {
          key: "status",
          label: "상태",
          type: "select",
          required: true,
          options: [
            { value: "active", label: "활성" },
            { value: "inactive", label: "비활성" },
          ],
        },
        { key: "memo", label: "메모", type: "textarea", className: "md:col-span-2" },
      ]}
      columns={[
        { key: "name", label: "고객사명" },
        { key: "business_registration_number", label: "사업자등록번호", render: (item) => item.business_registration_number || "-" },
        { key: "contact_name", label: "담당자", render: (item) => item.contact_name || "-" },
        { key: "contact_phone", label: "연락처", render: (item) => item.contact_phone || "-" },
        {
          key: "status",
          label: "상태",
          render: (item) => <span className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</span>,
        },
      ]}
      searchPlaceholder="고객사명, 담당자, 사업자등록번호 검색"
      onCreate={(payload) => mutations.create.mutate(payload)}
      onUpdate={(id, payload) => mutations.update.mutate({ id, payload })}
      onDelete={(id) => mutations.remove.mutate(id)}
    />
  );
}
