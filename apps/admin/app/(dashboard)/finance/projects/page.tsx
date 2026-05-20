"use client";

import { useQuery } from "@tanstack/react-query";
import { FinanceCrudPage } from "../_components/FinanceCrudPage";
import { formatCurrency, statusBadgeClass, statusLabel } from "../_components/finance-format";
import {
  useFinanceClients,
  useFinanceMutation,
  useFinanceProjects,
  type FinanceProject,
} from "@/hooks/useFinance";
import { queryKeys } from "@/lib/query-keys";

type Member = { id: string; full_name: string };

export default function FinanceProjectsPage() {
  const { data = [], isLoading } = useFinanceProjects();
  const { data: clients = [] } = useFinanceClients();
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("멤버 조회 실패");
      return res.json();
    },
  });
  const mutations = useFinanceMutation("projects");

  return (
    <FinanceCrudPage<FinanceProject>
      title="프로젝트/계약"
      description="고객사에 연결된 프로젝트, 계약 기간, 계약 금액과 담당자를 관리합니다."
      items={data}
      isLoading={isLoading}
      defaultValues={{
        client_id: "",
        name: "",
        contract_start_date: "",
        contract_end_date: "",
        contract_amount: "0",
        owner_member_id: "",
        status: "draft",
        memo: "",
      }}
      fields={[
        {
          key: "client_id",
          label: "고객사",
          type: "select",
          required: true,
          options: clients.map((client) => ({ value: client.id, label: client.name })),
        },
        { key: "name", label: "프로젝트명", required: true },
        { key: "contract_start_date", label: "계약 시작일", type: "date" },
        { key: "contract_end_date", label: "계약 종료일", type: "date" },
        { key: "contract_amount", label: "계약 금액", type: "number" },
        {
          key: "owner_member_id",
          label: "담당자",
          type: "select",
          options: members.map((member) => ({ value: member.id, label: member.full_name })),
        },
        {
          key: "status",
          label: "상태",
          type: "select",
          required: true,
          options: [
            { value: "draft", label: "작성" },
            { value: "active", label: "진행" },
            { value: "completed", label: "완료" },
            { value: "paused", label: "보류" },
            { value: "canceled", label: "취소" },
          ],
        },
        { key: "memo", label: "메모", type: "textarea", className: "md:col-span-2" },
      ]}
      columns={[
        { key: "client", label: "고객사", render: (item) => item.client?.name || "-" },
        { key: "name", label: "프로젝트명" },
        { key: "contract_end_date", label: "계약 종료일", render: (item) => item.contract_end_date || "-" },
        { key: "contract_amount", label: "계약 금액", render: (item) => formatCurrency(item.contract_amount) },
        { key: "owner", label: "담당자", render: (item) => item.owner?.full_name || "-" },
        {
          key: "status",
          label: "상태",
          render: (item) => <span className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</span>,
        },
      ]}
      searchPlaceholder="고객사, 프로젝트명, 담당자 검색"
      onCreate={(payload) => mutations.create.mutate(payload)}
      onUpdate={(id, payload) => mutations.update.mutate({ id, payload })}
      onDelete={(id) => mutations.remove.mutate(id)}
    />
  );
}
