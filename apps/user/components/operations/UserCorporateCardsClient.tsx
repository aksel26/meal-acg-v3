"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@repo/ui/src/sonner";
import {
  OperationConfirmDialog,
  OperationEmpty,
  OperationLoading,
  OperationPagination,
  OperationsPage,
  OperationsSection,
  OperationStatus,
  operationButtonClass,
  operationDangerButtonClass,
  operationInputClass,
  operationSecondaryButtonClass,
  operationTextareaClass,
} from "@repo/ui/src/operations";
import { formatWon, operationRequest, today } from "./client";

type CorporateCard = {
  id: string;
  name: string;
  issuer: string;
  last_four: string;
  monthly_limit: number | null;
  status: string;
};
type Transaction = {
  id: string;
  card_id: string;
  usage_date: string;
  merchant: string;
  amount: number;
  category: string;
  business_purpose: string;
  note: string | null;
  receipt_storage_path: string | null;
  status: string;
  rejection_reason: string | null;
  card: CorporateCard;
};
const labels: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
  archived: "보관",
};

export function UserCorporateCardsClient() {
  const [cards, setCards] = useState<CorporateCard[]>([]);
  const [items, setItems] = useState<Transaction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cardId, setCardId] = useState("");
  const [usageDate, setUsageDate] = useState(today());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [purpose, setPurpose] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const receiptRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await operationRequest<{
        cards: CorporateCard[];
        transactions: Transaction[];
        pagination: { hasMore: boolean };
      }>(`/api/corporate-cards?page=${page}`);
      setCards(data.cards);
      setItems(data.transactions);
      setHasMore(data.pagination.hasMore);
      setCardId(
        (current) =>
          current ||
          data.cards.find((card) => card.status === "active")?.id ||
          "",
      );
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, [load]);

  function reset() {
    setEditingId(null);
    setCardId(cards.find((card) => card.status === "active")?.id ?? "");
    setUsageDate(today());
    setMerchant("");
    setAmount("");
    setCategory("");
    setPurpose("");
    setNote("");
    if (receiptRef.current) receiptRef.current.value = "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const body = {
        id: editingId,
        action: editingId ? "update" : undefined,
        cardId,
        usageDate,
        merchant,
        amount,
        category,
        businessPurpose: purpose,
        note,
      };
      const formData = new FormData();
      Object.entries(body).forEach(([key, value]) => {
        if (value != null) formData.set(key, String(value));
      });
      const receipt = receiptRef.current?.files?.[0];
      if (receipt) formData.set("receipt", receipt);
      await operationRequest("/api/corporate-cards", {
        method: editingId ? "PATCH" : "POST",
        body: formData,
      });
      toast.success(
        editingId ? "사용 내역을 수정했습니다." : "사용 내역을 등록했습니다.",
      );
      reset();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "등록에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      await operationRequest("/api/corporate-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "cancel" }),
      });
      toast.success("사용 내역을 취소했습니다.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "취소에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationsPage
      title="기업카드"
      description="배정된 기업카드의 사용 내역과 영수증을 등록합니다."
    >
      <OperationsSection title="배정 카드">
        {loading ? (
          <OperationLoading label="배정 카드를 불러오는 중" />
        ) : cards.length === 0 ? (
          <OperationEmpty>배정된 기업카드가 없습니다.</OperationEmpty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className="rounded-xl bg-slate-950 p-4 text-white"
              >
                <p className="text-sm text-slate-300">{card.issuer}</p>
                <p className="mt-3 font-semibold">{card.name}</p>
                <p className="mt-1 font-mono text-sm">•••• {card.last_four}</p>
                {card.monthly_limit != null && (
                  <p className="mt-4 text-xs text-slate-400">
                    월 한도 {formatWon(card.monthly_limit)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </OperationsSection>

      <OperationsSection
        title={editingId ? "사용 내역 수정" : "사용 내역 등록"}
      >
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-600">
            기업카드
            <select
              name="cardId"
              required
              value={cardId}
              onChange={(event) => setCardId(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            >
              <option value="">선택</option>
              {cards
                .filter((card) => card.status === "active")
                .map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} · {card.last_four}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            사용일
            <input
              name="usageDate"
              type="date"
              required
              value={usageDate}
              onChange={(event) => setUsageDate(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            금액
            <input
              name="amount"
              type="number"
              min="1"
              step="1"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            사용처
            <input
              name="merchant"
              autoComplete="organization"
              required
              value={merchant}
              onChange={(event) => setMerchant(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            분류
            <input
              name="category"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
              placeholder="예: 교통비, 소모품…"
            />
          </label>
          <label className="text-sm text-slate-600">
            영수증
            <input
              ref={receiptRef}
              name="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className={`mt-1 ${operationInputClass} py-2`}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-3">
            사용 목적
            <input
              name="purpose"
              required
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-3">
            메모
            <textarea
              name="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
            />
          </label>
          <div className="flex gap-2 md:col-span-3">
            <button
              disabled={busy || !cards.some((card) => card.status === "active")}
              className={operationButtonClass}
            >
              {editingId ? "수정 저장" : "등록"}
            </button>
            {editingId && (
              <button
                type="button"
                className={operationSecondaryButtonClass}
                onClick={reset}
              >
                수정 취소
              </button>
            )}
          </div>
        </form>
      </OperationsSection>

      <OperationsSection title="사용 내역">
        {loading ? (
          <OperationLoading label="기업카드 사용 내역을 불러오는 중" />
        ) : items.length === 0 ? (
          <OperationEmpty>등록된 사용 내역이 없습니다.</OperationEmpty>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-950">
                    {item.merchant} · {formatWon(item.amount)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.usage_date} · {item.card?.name} {item.card?.last_four}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.category} · {item.business_purpose}
                  </p>
                  {item.rejection_reason && (
                    <p className="mt-1 text-sm text-rose-600">
                      {item.rejection_reason}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <OperationStatus value={item.status} labels={labels} />
                  {item.receipt_storage_path && (
                    <a
                      href={`/api/corporate-cards?receipt=${item.id}`}
                      className={operationSecondaryButtonClass}
                    >
                      영수증
                    </a>
                  )}
                  {item.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className={operationSecondaryButtonClass}
                        onClick={() => {
                          setEditingId(item.id);
                          setCardId(item.card_id);
                          setUsageDate(item.usage_date);
                          setMerchant(item.merchant);
                          setAmount(String(item.amount));
                          setCategory(item.category);
                          setPurpose(item.business_purpose);
                          setNote(item.note ?? "");
                        }}
                      >
                        수정
                      </button>
                      <OperationConfirmDialog
                        title="사용 내역을 취소할까요?"
                        description="취소한 내역은 관리자 검토 대상에서 제외됩니다."
                        confirmLabel="내역 취소"
                        onConfirm={() => cancel(item.id)}
                      >
                        <button
                          type="button"
                          disabled={busy}
                          className={operationDangerButtonClass}
                        >
                          취소
                        </button>
                      </OperationConfirmDialog>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </OperationsSection>
      <OperationPagination
        page={page}
        hasMore={hasMore}
        disabled={loading || busy}
        onPageChange={setPage}
      />
    </OperationsPage>
  );
}
