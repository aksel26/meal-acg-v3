"use client";

import { useCallback, useEffect, useState } from "react";
import { DateRangePicker } from "@repo/ui/src/date-range-picker";
import { toast } from "@repo/ui/src/sonner";
import {
  OperationConfirmDialog,
  OperationEmpty,
  OperationFormDialog,
  OperationLoading,
  OperationPagination,
  OperationReasonDialog,
  OperationToolbar,
  OperationsPage,
  OperationsSection,
  OperationStatus,
  operationButtonClass,
  operationDangerButtonClass,
  operationInputClass,
  operationRecordClass,
  operationSecondaryButtonClass,
  operationTextareaClass,
} from "@repo/ui/src/operations";
import { adminOperationRequest, formatWon, today } from "./client";

type Member = { id: string; full_name: string; team_id: string | null };
type Team = { id: string; name: string };
type Card = {
  id: string;
  name: string;
  issuer: string;
  last_four: string;
  assigned_member_id: string | null;
  assigned_team_id: string | null;
  status: string;
  monthly_limit: number | null;
  note: string | null;
  assigned_member: Member | null;
  assigned_team: Team | null;
};
type Transaction = {
  id: string;
  card_id: string;
  member_id: string;
  usage_date: string;
  merchant: string;
  amount: number;
  category: string;
  business_purpose: string;
  note: string | null;
  status: string;
  rejection_reason: string | null;
  receipt_storage_path: string | null;
  member: Member;
  card: Card;
};
const statusLabels: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
  archived: "보관",
};

export function AdminCorporateCardsClient() {
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [cardEditingId, setCardEditingId] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [assignedMemberId, setAssignedMemberId] = useState("");
  const [assignedTeamId, setAssignedTeamId] = useState("");
  const [cardStatus, setCardStatus] = useState("active");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [cardNote, setCardNote] = useState("");
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [txEditingId, setTxEditingId] = useState<string | null>(null);
  const [txMemberId, setTxMemberId] = useState("");
  const [txCardId, setTxCardId] = useState("");
  const [usageDate, setUsageDate] = useState(today());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [purpose, setPurpose] = useState("");
  const [txNote, setTxNote] = useState("");
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminOperationRequest<{
        cards: Card[];
        transactions: Transaction[];
        members: Member[];
        teams: Team[];
        pagination: { hasMore: boolean };
      }>(`/api/corporate-cards?page=${page}`);
      setCards(data.cards);
      setTransactions(data.transactions);
      setMembers(data.members);
      setTeams(data.teams);
      setHasMore(data.pagination.hasMore);
      setTxMemberId((current) => current || data.members[0]?.id || "");
      setTxCardId(
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

  function resetCard() {
    setCardEditingId(null);
    setCardName("");
    setIssuer("");
    setLastFour("");
    setAssignedMemberId("");
    setAssignedTeamId("");
    setCardStatus("active");
    setMonthlyLimit("");
    setCardNote("");
  }

  function resetTransaction() {
    setTxEditingId(null);
    setTxMemberId(members[0]?.id ?? "");
    setTxCardId(cards.find((card) => card.status === "active")?.id ?? "");
    setUsageDate(today());
    setMerchant("");
    setAmount("");
    setCategory("");
    setPurpose("");
    setTxNote("");
  }

  async function call(
    method: "POST" | "PATCH" | "DELETE",
    body?: Record<string, unknown>,
    query = "",
  ) {
    setBusy(true);
    try {
      await adminOperationRequest(`/api/corporate-cards${query}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      toast.success("처리했습니다.");
      await load();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "처리에 실패했습니다.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveCard(event: React.FormEvent) {
    event.preventDefault();
    const saved = await call(cardEditingId ? "PATCH" : "POST", {
      id: cardEditingId,
      action: cardEditingId ? "update_card" : "create_card",
      name: cardName,
      issuer,
      lastFour,
      assignedMemberId,
      assignedTeamId,
      status: cardStatus,
      monthlyLimit,
      note: cardNote,
    });
    if (saved) {
      setCardFormOpen(false);
      resetCard();
    }
  }

  async function saveTransaction(event: React.FormEvent) {
    event.preventDefault();
    const saved = await call(txEditingId ? "PATCH" : "POST", {
      id: txEditingId,
      action: txEditingId ? "update_transaction" : "create_transaction",
      memberId: txMemberId,
      cardId: txCardId,
      usageDate,
      merchant,
      amount,
      category,
      businessPurpose: purpose,
      note: txNote,
    });
    if (saved) {
      setTxFormOpen(false);
      resetTransaction();
    }
  }

  return (
    <OperationsPage
      variant="admin"
      title="기업카드 관리"
      description="민감정보 없이 카드 기준정보와 사용 내역을 관리합니다."
    >
      <OperationFormDialog
        open={cardFormOpen}
        onOpenChange={(open) => {
          setCardFormOpen(open);
          if (!open) resetCard();
        }}
        title={cardEditingId ? "카드 수정" : "카드 추가"}
        description="카드 번호 전체를 제외한 관리 정보를 입력해주세요."
      >
        <form onSubmit={saveCard} className="grid gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-600">
            카드명
            <input
              required
              value={cardName}
              onChange={(event) => setCardName(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            카드사
            <input
              required
              value={issuer}
              onChange={(event) => setIssuer(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            끝 4자리
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={lastFour}
              onChange={(event) => setLastFour(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            월 한도
            <input
              type="number"
              min="0"
              value={monthlyLimit}
              onChange={(event) => setMonthlyLimit(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            배정 직원
            <select
              value={assignedMemberId}
              onChange={(event) => {
                setAssignedMemberId(event.target.value);
                if (event.target.value) setAssignedTeamId("");
              }}
              className={`mt-1 ${operationInputClass}`}
            >
              <option value="">없음</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            배정 팀
            <select
              value={assignedTeamId}
              onChange={(event) => {
                setAssignedTeamId(event.target.value);
                if (event.target.value) setAssignedMemberId("");
              }}
              className={`mt-1 ${operationInputClass}`}
            >
              <option value="">없음</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            상태
            <select
              value={cardStatus}
              onChange={(event) => setCardStatus(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            >
              <option value="active">사용</option>
              <option value="disabled">사용중지</option>
              <option value="archived">보관</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            메모
            <input
              value={cardNote}
              onChange={(event) => setCardNote(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <div className="flex justify-end gap-2 md:col-span-4">
            <button
              type="button"
              onClick={() => setCardFormOpen(false)}
              className={operationSecondaryButtonClass}
            >
              취소
            </button>
            <button disabled={busy} className={operationButtonClass}>
              저장
            </button>
          </div>
        </form>
      </OperationFormDialog>

      <OperationsSection title="카드 목록">
        <OperationToolbar
          action={
            cards.length > 0 ? (
              <button
                type="button"
                className={operationButtonClass}
                onClick={() => {
                  resetCard();
                  setCardFormOpen(true);
                }}
              >
                카드 추가
              </button>
            ) : undefined
          }
        />
        {loading ? (
          <OperationLoading label="기업카드 목록을 불러오는 중" />
        ) : cards.length === 0 ? (
          <OperationEmpty
            action={
              <button
                type="button"
                className={operationButtonClass}
                onClick={() => {
                  resetCard();
                  setCardFormOpen(true);
                }}
              >
                카드 추가
              </button>
            }
          >
            등록된 기업카드가 없습니다.
          </OperationEmpty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <article
                key={card.id}
                className="rounded-xl bg-slate-950 p-4 text-white"
              >
                <p className="text-sm text-slate-300">{card.issuer}</p>
                <p className="mt-2 font-semibold">{card.name}</p>
                <p className="font-mono text-sm">•••• {card.last_four}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {card.assigned_member?.full_name ||
                    card.assigned_team?.name ||
                    "미배정"}
                  {card.monthly_limit != null &&
                    ` · ${formatWon(card.monthly_limit)}`}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className={operationSecondaryButtonClass}
                    onClick={() => {
                      setCardEditingId(card.id);
                      setCardName(card.name);
                      setIssuer(card.issuer);
                      setLastFour(card.last_four);
                      setAssignedMemberId(card.assigned_member_id ?? "");
                      setAssignedTeamId(card.assigned_team_id ?? "");
                      setCardStatus(card.status);
                      setMonthlyLimit(
                        card.monthly_limit == null
                          ? ""
                          : String(card.monthly_limit),
                      );
                      setCardNote(card.note ?? "");
                      setCardFormOpen(true);
                    }}
                  >
                    수정
                  </button>
                  <OperationConfirmDialog
                    title="기업카드를 삭제할까요?"
                    description="사용 내역이 연결된 카드는 삭제할 수 없습니다."
                    confirmLabel="카드 삭제"
                    onConfirm={async () => {
                      await call(
                        "DELETE",
                        undefined,
                        `?type=card&id=${card.id}`,
                      );
                    }}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      className={operationDangerButtonClass}
                    >
                      삭제
                    </button>
                  </OperationConfirmDialog>
                </div>
              </article>
            ))}
          </div>
        )}
      </OperationsSection>

      <OperationFormDialog
        open={txFormOpen}
        onOpenChange={(open) => {
          setTxFormOpen(open);
          if (!open) resetTransaction();
        }}
        title={txEditingId ? "사용 내역 수정" : "사용 내역 추가"}
        description="사용자, 카드, 사용일과 비용 정보를 입력해주세요."
      >
        <form onSubmit={saveTransaction} className="grid gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-600">
            사용자
            <select
              value={txMemberId}
              onChange={(event) => setTxMemberId(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            카드
            <select
              value={txCardId}
              onChange={(event) => setTxCardId(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            >
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} · {card.last_four}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            사용일
            <DateRangePicker
              mode="single"
              modal
              startDate={usageDate}
              ariaLabel="기업카드 사용일"
              placeholder="사용일 선택"
              className="mt-1"
              onChange={({ startDate }) => setUsageDate(startDate)}
            />
          </label>
          <label className="text-sm text-slate-600">
            금액
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            사용처
            <input
              required
              value={merchant}
              onChange={(event) => setMerchant(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            분류
            <input
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            사용 목적
            <input
              required
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-4">
            메모
            <textarea
              value={txNote}
              onChange={(event) => setTxNote(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
            />
          </label>
          <div className="flex justify-end gap-2 md:col-span-4">
            <button
              type="button"
              onClick={() => setTxFormOpen(false)}
              className={operationSecondaryButtonClass}
            >
              취소
            </button>
            <button
              disabled={busy || cards.length === 0 || !usageDate}
              className={operationButtonClass}
            >
              저장
            </button>
          </div>
        </form>
      </OperationFormDialog>

      <OperationsSection title="사용 내역 검토">
        <OperationToolbar
          action={
            transactions.length > 0 ? (
              <button
                type="button"
                className={operationButtonClass}
                disabled={cards.length === 0}
                onClick={() => {
                  resetTransaction();
                  setTxFormOpen(true);
                }}
              >
                사용 내역 추가
              </button>
            ) : undefined
          }
        />
        {loading ? (
          <OperationLoading label="기업카드 사용 내역을 불러오는 중" />
        ) : transactions.length === 0 ? (
          <OperationEmpty
            action={
              <button
                type="button"
                className={operationButtonClass}
                disabled={cards.length === 0}
                onClick={() => {
                  resetTransaction();
                  setTxFormOpen(true);
                }}
              >
                사용 내역 추가
              </button>
            }
          >
            등록된 사용 내역이 없습니다.
          </OperationEmpty>
        ) : (
          <div className="space-y-2">
            {transactions.map((item) => (
              <div key={item.id} className={operationRecordClass}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {item.member?.full_name} · {item.merchant} ·{" "}
                      {formatWon(item.amount)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.usage_date} · {item.card?.name}{" "}
                      {item.card?.last_four} · {item.business_purpose}
                    </p>
                  </div>
                  <OperationStatus value={item.status} labels={statusLabels} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
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
                          setTxEditingId(item.id);
                          setTxMemberId(item.member_id);
                          setTxCardId(item.card_id);
                          setUsageDate(item.usage_date);
                          setMerchant(item.merchant);
                          setAmount(String(item.amount));
                          setCategory(item.category);
                          setPurpose(item.business_purpose);
                          setTxNote(item.note ?? "");
                          setTxFormOpen(true);
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className={operationButtonClass}
                        onClick={() =>
                          call("PATCH", {
                            id: item.id,
                            action: "approve_transaction",
                          })
                        }
                      >
                        승인
                      </button>
                      <OperationReasonDialog
                        title="사용 내역을 반려할까요?"
                        description="사용자에게 표시할 반려 사유를 입력해주세요."
                        label="반려 사유"
                        confirmLabel="반려"
                        onConfirm={async (reason) => {
                          await call("PATCH", {
                            id: item.id,
                            action: "reject_transaction",
                            reason,
                          });
                        }}
                      >
                        <button
                          type="button"
                          className={operationDangerButtonClass}
                        >
                          반려
                        </button>
                      </OperationReasonDialog>
                    </>
                  )}
                  {["approved", "rejected", "cancelled"].includes(
                    item.status,
                  ) && (
                    <button
                      type="button"
                      className={operationSecondaryButtonClass}
                      onClick={() =>
                        call("PATCH", {
                          id: item.id,
                          action: "archive_transaction",
                        })
                      }
                    >
                      보관
                    </button>
                  )}
                  {["pending", "rejected", "cancelled"].includes(
                    item.status,
                  ) && (
                    <OperationConfirmDialog
                      title="사용 내역을 삭제할까요?"
                      description="삭제한 사용 내역은 복구할 수 없습니다."
                      confirmLabel="내역 삭제"
                      onConfirm={async () => {
                        await call(
                          "DELETE",
                          undefined,
                          `?type=transaction&id=${item.id}`,
                        );
                      }}
                    >
                      <button
                        type="button"
                        className={operationDangerButtonClass}
                      >
                        삭제
                      </button>
                    </OperationConfirmDialog>
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
