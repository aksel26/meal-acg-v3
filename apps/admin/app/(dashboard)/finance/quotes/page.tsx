"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/src/dialog";
import { FinanceCrudPage } from "../_components/FinanceCrudPage";
import { formatCurrency, statusBadgeClass, statusLabel } from "../_components/finance-format";
import {
  useFinanceClients,
  useFinanceMutation,
  useFinanceProjects,
  useFinanceQuoteItemMutation,
  useFinanceQuotes,
  useFinanceStatusMutation,
  type FinanceQuote,
  type FinanceQuoteItem,
} from "@/hooks/useFinance";

export default function FinanceQuotesPage() {
  const { data = [], isLoading } = useFinanceQuotes();
  const { data: clients = [] } = useFinanceClients();
  const { data: projects = [] } = useFinanceProjects();
  const mutations = useFinanceMutation("quotes");
  const statusMutation = useFinanceStatusMutation("quotes");
  const [selectedQuote, setSelectedQuote] = useState<FinanceQuote | null>(null);

  const clientOptions = clients.map((client) => ({ value: client.id, label: client.name }));
  const projectOptions = projects.map((project) => ({ value: project.id, label: `${project.client?.name || "-"} / ${project.name}` }));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <FinanceCrudPage<FinanceQuote>
        title="견적서"
        description="견적서 헤더와 승인 상태를 관리합니다. 품목은 우측 패널에서 추가합니다."
        items={data}
        isLoading={isLoading}
        defaultValues={{
          client_id: "",
          project_id: "",
          quote_no: "",
          quote_date: new Date().toISOString().slice(0, 10),
          valid_until: "",
          status: "draft",
          memo: "",
        }}
        fields={[
          { key: "client_id", label: "고객사", type: "select", required: true, options: clientOptions },
          { key: "project_id", label: "프로젝트", type: "select", options: projectOptions },
          { key: "quote_no", label: "견적번호", required: true },
          { key: "quote_date", label: "견적일", type: "date" },
          { key: "valid_until", label: "유효기간", type: "date" },
          {
            key: "status",
            label: "상태",
            type: "select",
            required: true,
            options: [
              { value: "draft", label: "작성" },
              { value: "sent", label: "발송" },
              { value: "approved", label: "승인" },
              { value: "rejected", label: "반려" },
              { value: "expired", label: "만료" },
            ],
          },
          { key: "memo", label: "메모", type: "textarea", className: "md:col-span-2" },
        ]}
        columns={[
          { key: "quote_no", label: "견적번호" },
          { key: "client", label: "고객사", render: (item) => item.client?.name || "-" },
          { key: "project", label: "프로젝트", render: (item) => item.project?.name || "-" },
          { key: "quote_date", label: "견적일" },
          { key: "total_amount", label: "합계", render: (item) => formatCurrency(item.total_amount) },
          {
            key: "status",
            label: "상태",
            render: (item) => <span className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</span>,
          },
          {
            key: "items",
            label: "품목",
            render: (item) => (
              <Button size="sm" variant="outline" onClick={() => setSelectedQuote(item)}>
                {item.items?.length || 0}개
              </Button>
            ),
          },
        ]}
        searchPlaceholder="견적번호, 고객사, 프로젝트 검색"
        onCreate={(payload) => mutations.create.mutate(payload)}
        onUpdate={(id, payload) => mutations.update.mutate({ id, payload })}
        onDelete={(id) => mutations.remove.mutate(id)}
      />

      <QuoteItemsPanel
        quote={selectedQuote}
        onClose={() => setSelectedQuote(null)}
        onStatus={(id, status) => statusMutation.mutate({ id, status })}
      />
    </div>
  );
}

function QuoteItemsPanel({
  quote,
  onClose,
  onStatus,
}: {
  quote: FinanceQuote | null;
  onClose: () => void;
  onStatus: (id: string, status: string) => void;
}) {
  const itemMutation = useFinanceQuoteItemMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinanceQuoteItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "", quantity: "1", unit_price: "0", sort_order: "0" });
  const items = useMemo(() => [...(quote?.items || [])].sort((a, b) => a.sort_order - b.sort_order), [quote]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: "", description: "", quantity: "1", unit_price: "0", sort_order: String(items.length + 1) });
    setDialogOpen(true);
  };

  const openEdit = (item: FinanceQuoteItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || "",
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
      sort_order: String(item.sort_order),
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!quote) return;
    itemMutation.mutate({
      quoteId: quote.id,
      itemId: editingItem?.id,
      method: editingItem ? "PUT" : "POST",
      payload: form,
    });
    setDialogOpen(false);
  };

  return (
    <aside className="rounded-xl bg-white p-4">
      {!quote ? (
        <div className="py-20 text-center text-sm text-slate-400">견적서의 품목 버튼을 선택하세요.</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">{quote.quote_no}</h3>
              <p className="text-sm text-slate-500">{quote.client?.name || "-"} / {formatCurrency(quote.total_amount)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={onClose}>닫기</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["sent", "approved", "rejected", "expired"].map((status) => (
              <Button key={status} size="sm" variant="outline" onClick={() => onStatus(quote.id, status)}>
                {statusLabel(status)}
              </Button>
            ))}
          </div>
          <Button className="w-full gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            품목 추가
          </Button>
          <div className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">품목이 없습니다.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <button className="min-w-0 text-left" onClick={() => openEdit(item)}>
                      <p className="truncate font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.quantity} x {formatCurrency(item.unit_price)}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.total_amount)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => itemMutation.mutate({ quoteId: quote.id, itemId: item.id, method: "DELETE" })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "품목 수정" : "품목 추가"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="품목명" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Field label="수량" type="number" value={form.quantity} onChange={(value) => setForm((current) => ({ ...current, quantity: value }))} />
            <Field label="단가" type="number" value={form.unit_price} onChange={(value) => setForm((current) => ({ ...current, unit_price: value }))} />
            <Field label="정렬" type="number" value={form.sort_order} onChange={(value) => setForm((current) => ({ ...current, sort_order: value }))} />
            <Field label="설명" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} className="md:col-span-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={submit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Input className="mt-1" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
