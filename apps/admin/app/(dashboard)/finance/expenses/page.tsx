"use client";

import { useQuery } from "@tanstack/react-query";
import { FinanceCrudPage } from "../_components/FinanceCrudPage";
import { formatCurrency, statusBadgeClass, statusLabel } from "../_components/finance-format";
import {
  useFinanceExpenses,
  useFinanceMutation,
  useFinanceProjects,
  useFinanceStatusMutation,
  type FinanceExpense,
} from "@/hooks/useFinance";
import { queryKeys } from "@/lib/query-keys";

type Member = { id: string; full_name: string };

export default function FinanceExpensesPage() {
  const { data = [], isLoading } = useFinanceExpenses();
  const { data: projects = [] } = useFinanceProjects();
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("멤버 조회 실패");
      return res.json();
    },
  });
  const mutations = useFinanceMutation("expenses");
  const statusMutation = useFinanceStatusMutation("expenses");

  return (
    <FinanceCrudPage<FinanceExpense>
      title="비용 정산"
      description="프로젝트별 비용 정산, 승인/반려, 지급 상태를 관리합니다."
      items={data}
      isLoading={isLoading}
      defaultValues={{
        project_id: "",
        requester_id: "",
        expense_type: "",
        used_at: new Date().toISOString().slice(0, 10),
        amount: "0",
        description: "",
        status: "draft",
        reject_reason: "",
        memo: "",
      }}
      fields={[
        { key: "project_id", label: "프로젝트", type: "select", required: true, options: projects.map((project) => ({ value: project.id, label: project.name })) },
        { key: "requester_id", label: "신청자", type: "select", options: members.map((member) => ({ value: member.id, label: member.full_name })) },
        { key: "expense_type", label: "비용 유형", required: true },
        { key: "used_at", label: "사용일", type: "date" },
        { key: "amount", label: "금액", type: "number" },
        {
          key: "status",
          label: "상태",
          type: "select",
          required: true,
          options: [
            { value: "draft", label: "작성" },
            { value: "submitted", label: "제출" },
            { value: "approved", label: "승인" },
            { value: "paid", label: "지급 완료" },
            { value: "rejected", label: "반려" },
          ],
        },
        { key: "description", label: "내용", type: "textarea", className: "md:col-span-2" },
        { key: "reject_reason", label: "반려 사유", className: "md:col-span-2" },
        { key: "memo", label: "메모", type: "textarea", className: "md:col-span-2" },
      ]}
      columns={[
        { key: "project", label: "프로젝트", render: (item) => item.project?.name || "-" },
        { key: "requester", label: "신청자", render: (item) => item.requester?.full_name || "-" },
        { key: "expense_type", label: "유형" },
        { key: "used_at", label: "사용일" },
        { key: "amount", label: "금액", render: (item) => formatCurrency(item.amount) },
        {
          key: "status",
          label: "상태",
          render: (item) => <span className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</span>,
        },
        {
          key: "actions",
          label: "승인",
          render: (item) => (
            <div className="flex gap-1">
              <button className="text-xs text-slate-600 hover:underline" onClick={() => statusMutation.mutate({ id: item.id, status: "approved" })}>승인</button>
              <button className="text-xs text-slate-600 hover:underline" onClick={() => statusMutation.mutate({ id: item.id, status: "paid" })}>지급</button>
              <button className="text-xs text-slate-600 hover:underline" onClick={() => statusMutation.mutate({ id: item.id, status: "rejected", reject_reason: "관리자 반려" })}>반려</button>
            </div>
          ),
        },
      ]}
      searchPlaceholder="프로젝트, 신청자, 비용 유형 검색"
      onCreate={(payload) => mutations.create.mutate(payload)}
      onUpdate={(id, payload) => mutations.update.mutate({ id, payload })}
      onDelete={(id) => mutations.remove.mutate(id)}
    />
  );
}
