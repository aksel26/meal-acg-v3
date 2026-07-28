"use client";

import { useCallback, useEffect, useState } from "react";
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
import { operationRequest } from "./client";

type ChecklistItem = {
  id: string;
  title: string;
  responsible_party: string | null;
  is_completed: boolean;
  completion_note: string | null;
  completed_at: string | null;
};
type OffboardingRequest = {
  id: string;
  requested_final_working_date: string;
  confirmed_final_working_date: string | null;
  reason: string;
  note: string | null;
  status: string;
  rejection_reason: string | null;
  admin_note: string | null;
  created_at: string;
  checklist: ChecklistItem[];
};

const labels: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인",
  rejected: "반려",
  completed: "완료",
  cancelled: "취소",
};

export function UserOffboardingClient() {
  const [requests, setRequests] = useState<OffboardingRequest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await operationRequest<{
        requests: OffboardingRequest[];
        pagination: { hasMore: boolean };
      }>(`/api/offboarding?page=${page}`);
      setRequests(data.requests);
      setHasMore(data.pagination.hasMore);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, [load]);

  function reset() {
    setEditingId(null);
    setDate("");
    setReason("");
    setNote("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await operationRequest("/api/offboarding", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          action: editingId ? "update" : undefined,
          requestedFinalWorkingDate: date,
          reason,
          note,
        }),
      });
      toast.success(
        editingId ? "요청을 수정했습니다." : "요청을 등록했습니다.",
      );
      reset();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      await operationRequest("/api/offboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "cancel" }),
      });
      toast.success("요청을 취소했습니다.");
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
      title="오프보딩"
      description="퇴사 관련 요청과 관리자 체크리스트 진행 상태를 확인합니다."
    >
      <OperationsSection title={editingId ? "요청 수정" : "오프보딩 요청"}>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            희망 최종 근무일
            <input
              name="requestedFinalWorkingDate"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            사유
            <input
              name="reason"
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
              maxLength={1000}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            메모
            <textarea
              name="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
              maxLength={2000}
            />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button disabled={busy} className={operationButtonClass}>
              {editingId ? "수정 저장" : "요청 등록"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                className={operationSecondaryButtonClass}
              >
                수정 취소
              </button>
            )}
          </div>
        </form>
      </OperationsSection>

      <OperationsSection title="나의 요청 이력">
        {loading ? (
          <OperationLoading label="오프보딩 요청을 불러오는 중" />
        ) : requests.length === 0 ? (
          <OperationEmpty>등록된 요청이 없습니다.</OperationEmpty>
        ) : (
          <div className="space-y-3">
            {requests.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-950">
                      희망 {item.requested_final_working_date}
                      {item.confirmed_final_working_date &&
                        ` · 확정 ${item.confirmed_final_working_date}`}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
                  </div>
                  <OperationStatus value={item.status} labels={labels} />
                </div>
                {(item.rejection_reason || item.admin_note) && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {item.rejection_reason || item.admin_note}
                  </p>
                )}
                {item.checklist.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {item.checklist
                      .sort((a, b) => a.title.localeCompare(b.title))
                      .map((check) => (
                        <li
                          key={check.id}
                          className="flex items-start gap-2 text-sm text-slate-600"
                        >
                          <span>{check.is_completed ? "✓" : "○"}</span>
                          <span>
                            {check.title}
                            {check.responsible_party &&
                              ` · ${check.responsible_party}`}
                            {check.completion_note &&
                              ` · ${check.completion_note}`}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
                {item.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className={operationSecondaryButtonClass}
                      onClick={() => {
                        setEditingId(item.id);
                        setDate(item.requested_final_working_date);
                        setReason(item.reason);
                        setNote(item.note ?? "");
                      }}
                    >
                      수정
                    </button>
                    <OperationConfirmDialog
                      title="오프보딩 요청을 취소할까요?"
                      description="취소한 요청은 관리자 처리 대상에서 제외됩니다."
                      confirmLabel="요청 취소"
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
                  </div>
                )}
              </article>
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
