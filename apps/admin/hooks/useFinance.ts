"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import { queryKeys } from "@/lib/query-keys";

export type FinanceClient = {
  id: string;
  name: string;
  business_registration_number: string | null;
  representative_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  payment_terms: string | null;
  status: "active" | "inactive";
  memo: string | null;
};

export type FinanceProject = {
  id: string;
  client_id: string;
  name: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_amount: number;
  owner_member_id: string | null;
  status: "draft" | "active" | "completed" | "paused" | "canceled";
  memo: string | null;
  client?: { id: string; name: string } | null;
  owner?: { id: string; full_name: string } | null;
};

export type FinanceQuoteItem = {
  id: string;
  quote_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  supply_amount: number;
  tax_amount: number;
  total_amount: number;
  sort_order: number;
};

export type FinanceQuote = {
  id: string;
  client_id: string;
  project_id: string | null;
  quote_no: string;
  quote_date: string;
  valid_until: string | null;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  memo: string | null;
  client?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  items?: FinanceQuoteItem[];
};

export type FinanceRevenue = {
  id: string;
  client_id: string;
  project_id: string | null;
  quote_id: string | null;
  revenue_month: string;
  revenue_date: string | null;
  amount: number;
  tax_invoice_status: "none" | "scheduled" | "issued";
  expected_payment_date: string | null;
  paid_at: string | null;
  status: "expected" | "invoiced" | "paid" | "overdue" | "canceled";
  memo: string | null;
  client?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  quote?: { id: string; quote_no: string } | null;
};

export type FinanceExpense = {
  id: string;
  project_id: string;
  requester_id: string | null;
  expense_type: string;
  used_at: string;
  amount: number;
  description: string;
  status: "draft" | "submitted" | "approved" | "paid" | "rejected";
  reject_reason: string | null;
  memo: string | null;
  project?: { id: string; name: string; client?: { id: string; name: string } | null } | null;
  requester?: { id: string; full_name: string } | null;
  approver?: { id: string; full_name: string } | null;
};

export type FinanceReportSummary = {
  month: string;
  totalRevenue: number;
  paidRevenue: number;
  receivable: number;
  totalExpenses: number;
  unpaidExpenses: number;
  margin: number;
  revenueCount: number;
  expenseCount: number;
  revenueByClient: { clientName: string; amount: number }[];
  profitByProject: { projectName: string; revenue: number; expenses: number; margin: number }[];
};

type Filters = Record<string, string | undefined>;

// 빈 값/"all"을 제거한 정규화 필터. 쿼리키와 요청 파라미터가 항상 일치하도록 단일 소스로 쓴다.
function normalizeFilters(filters?: Filters): Record<string, string> {
  const normalized: Record<string, string> = {};
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value && value !== "all") normalized[key] = value;
  });
  return normalized;
}

function toParams(filters?: Filters) {
  return new URLSearchParams(normalizeFilters(filters)).toString();
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "요청 처리에 실패했습니다.");
  }
  return res.json();
}

export function useFinanceClients(filters?: Filters) {
  return useQuery<FinanceClient[]>({
    queryKey: queryKeys.finance.clients(normalizeFilters(filters)),
    queryFn: () => requestJson(`/api/finance/clients?${toParams(filters)}`),
  });
}

export function useFinanceProjects(filters?: Filters) {
  return useQuery<FinanceProject[]>({
    queryKey: queryKeys.finance.projects(normalizeFilters(filters)),
    queryFn: () => requestJson(`/api/finance/projects?${toParams(filters)}`),
  });
}

export function useFinanceQuotes(filters?: Filters) {
  return useQuery<FinanceQuote[]>({
    queryKey: queryKeys.finance.quotes(normalizeFilters(filters)),
    queryFn: () => requestJson(`/api/finance/quotes?${toParams(filters)}`),
  });
}

export function useFinanceRevenue(filters?: Filters) {
  return useQuery<FinanceRevenue[]>({
    queryKey: queryKeys.finance.revenue(normalizeFilters(filters)),
    queryFn: () => requestJson(`/api/finance/revenue?${toParams(filters)}`),
  });
}

export function useFinanceExpenses(filters?: Filters) {
  return useQuery<FinanceExpense[]>({
    queryKey: queryKeys.finance.expenses(normalizeFilters(filters)),
    queryFn: () => requestJson(`/api/finance/expenses?${toParams(filters)}`),
  });
}

export function useFinanceReportSummary(month: string) {
  return useQuery<FinanceReportSummary>({
    queryKey: queryKeys.finance.reports({ month }),
    queryFn: () => requestJson(`/api/finance/reports/summary?month=${month}`),
  });
}

export function useFinanceMutation(resource: "clients" | "projects" | "quotes" | "revenue" | "expenses") {
  const queryClient = useQueryClient();
  const base = `/api/finance/${resource}`;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["finance"] });

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      requestJson(base, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      invalidate();
      toast.success("등록되었습니다.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      requestJson(`${base}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: () => {
      invalidate();
      toast.success("수정되었습니다.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => requestJson(`${base}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("처리되었습니다.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { create, update, remove };
}

export function useFinanceQuoteItemMutation() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["finance", "quotes"] });

  return useMutation({
    mutationFn: ({
      quoteId,
      itemId,
      payload,
      method,
    }: {
      quoteId: string;
      itemId?: string;
      payload?: Record<string, unknown>;
      method: "POST" | "PUT" | "DELETE";
    }) =>
      requestJson(
        itemId
          ? `/api/finance/quotes/${quoteId}/items/${itemId}`
          : `/api/finance/quotes/${quoteId}/items`,
        { method, body: payload ? JSON.stringify(payload) : undefined },
      ),
    onSuccess: () => {
      invalidate();
      toast.success("견적 품목이 반영되었습니다.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useFinanceStatusMutation(kind: "quotes" | "expenses") {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["finance"] });

  return useMutation({
    mutationFn: ({ id, status, reject_reason }: { id: string; status: string; reject_reason?: string }) =>
      requestJson(`/api/finance/${kind}/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, reject_reason }),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("상태가 변경되었습니다.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
