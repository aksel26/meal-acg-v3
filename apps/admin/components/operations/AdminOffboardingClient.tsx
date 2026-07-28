"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@repo/ui/src/sonner";
import {
  OperationConfirmDialog,
  OperationEmpty,
  OperationLoading,
  OperationPagination,
  OperationReasonDialog,
  OperationsPage,
  OperationsSection,
  OperationStatus,
  operationButtonClass,
  operationDangerButtonClass,
  operationInputClass,
  operationSecondaryButtonClass,
  operationTextareaClass,
} from "@repo/ui/src/operations";
import { adminOperationRequest } from "./client";

type Member = { id: string; full_name: string };
type Checklist = {
  id: string;
  title: string;
  responsible_party: string | null;
  is_completed: boolean;
  completion_note: string | null;
};
type Offboarding = {
  id: string;
  member_id: string;
  requested_final_working_date: string;
  confirmed_final_working_date: string | null;
  reason: string;
  note: string | null;
  admin_note: string | null;
  rejection_reason: string | null;
  status: string;
  member: Member;
  checklist: Checklist[];
};
const labels: Record<string, string> = {
  pending: "대기",
  approved: "진행",
  rejected: "반려",
  completed: "완료",
  cancelled: "취소",
};

export function AdminOffboardingClient() {
  const [requests, setRequests] = useState<Offboarding[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [confirmedDate, setConfirmedDate] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [checkTitle, setCheckTitle] = useState("");
  const [responsibleParty, setResponsibleParty] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (statusFilter) params.set("status", statusFilter);
        if (memberFilter.trim()) params.set("member", memberFilter.trim());
        if (dateFilter) params.set("date", dateFilter);
        const data = await adminOperationRequest<{
          requests: Offboarding[];
          members: Member[];
          pagination: { hasMore: boolean };
        }>(`/api/offboarding?${params}`, { signal });
        setRequests(data.requests);
        setMembers(data.members);
        setHasMore(data.pagination.hasMore);
        setMemberId((current) => current || data.members[0]?.id || "");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [dateFilter, memberFilter, page, statusFilter],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((error) => {
      if (error.name !== "AbortError") toast.error(error.message);
    });
    return () => controller.abort();
  }, [load]);

  const selected = requests.find((item) => item.id === selectedId) ?? null;
  function select(item: Offboarding) {
    setSelectedId(item.id);
    setMemberId(item.member_id);
    setRequestedDate(item.requested_final_working_date);
    setConfirmedDate(item.confirmed_final_working_date ?? "");
    setReason(item.reason);
    setNote(item.note ?? "");
    setAdminNote(item.admin_note ?? "");
  }

  function resetForm() {
    setSelectedId(null);
    setMemberId(members[0]?.id ?? "");
    setRequestedDate("");
    setConfirmedDate("");
    setReason("");
    setNote("");
    setAdminNote("");
  }

  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await adminOperationRequest("/api/offboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success("처리했습니다.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "처리에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await adminOperationRequest("/api/offboarding", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          action: selectedId ? "update" : undefined,
          memberId,
          requestedFinalWorkingDate: requestedDate,
          confirmedFinalWorkingDate: confirmedDate,
          reason,
          note,
          adminNote,
        }),
      });
      toast.success(
        selectedId ? "요청을 수정했습니다." : "요청을 등록했습니다.",
      );
      resetForm();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationsPage
      variant="admin"
      title="오프보딩 관리"
      description="요청 승인부터 수동 체크리스트 완료까지 관리합니다."
    >
      <OperationsSection
        key={selectedId ?? "new-offboarding"}
        title={selectedId ? "요청 수정" : "요청 등록"}
        collapsible
        defaultOpen={Boolean(selectedId)}
      >
        <form onSubmit={save} className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-600">
            직원
            <select
              required
              disabled={Boolean(selectedId)}
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
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
            희망 최종 근무일
            <input
              type="date"
              required
              value={requestedDate}
              onChange={(event) => setRequestedDate(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            확정 최종 근무일
            <input
              type="date"
              value={confirmedDate}
              onChange={(event) => setConfirmedDate(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            사유
            <input
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            관리자 메모
            <input
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-3">
            메모
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
            />
          </label>
          <div className="flex gap-2 md:col-span-3">
            <button disabled={busy} className={operationButtonClass}>
              저장
            </button>
            {selectedId && (
              <button
                type="button"
                className={operationSecondaryButtonClass}
                onClick={resetForm}
              >
                새 요청
              </button>
            )}
          </div>
        </form>
      </OperationsSection>

      <OperationsSection title="요청 필터">
        <div className="grid gap-3 md:grid-cols-3">
          <select
            aria-label="오프보딩 요청 상태 필터"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className={operationInputClass}
          >
            <option value="">전체 상태</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label="직원명 검색"
            name="memberSearch"
            value={memberFilter}
            onChange={(event) => {
              setMemberFilter(event.target.value);
              setPage(1);
            }}
            className={operationInputClass}
            placeholder="예: 홍길동…"
          />
          <input
            type="date"
            aria-label="최종 근무일 필터"
            value={dateFilter}
            onChange={(event) => {
              setDateFilter(event.target.value);
              setPage(1);
            }}
            className={operationInputClass}
          />
        </div>
      </OperationsSection>

      <OperationsSection title="전체 요청">
        {loading ? (
          <OperationLoading label="오프보딩 요청을 불러오는 중" />
        ) : requests.length === 0 ? (
          <OperationEmpty>조건에 맞는 요청이 없습니다.</OperationEmpty>
        ) : (
          <div className="space-y-2">
            {requests.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-950">
                    {item.member?.full_name} ·{" "}
                    {item.requested_final_working_date}
                  </p>
                  <p className="text-sm text-slate-500">{item.reason}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <OperationStatus value={item.status} labels={labels} />
                  <button
                    type="button"
                    className={operationSecondaryButtonClass}
                    onClick={() => select(item)}
                  >
                    관리
                  </button>
                  {item.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        className={operationButtonClass}
                        onClick={() =>
                          mutate({
                            id: item.id,
                            action: "approve",
                            confirmedFinalWorkingDate:
                              item.confirmed_final_working_date ||
                              item.requested_final_working_date,
                          })
                        }
                      >
                        승인
                      </button>
                      <OperationReasonDialog
                        title="오프보딩 요청을 반려할까요?"
                        description="신청자에게 표시할 반려 사유를 입력해주세요."
                        label="반려 사유"
                        confirmLabel="반려"
                        onConfirm={(rejectReason) =>
                          mutate({
                            id: item.id,
                            action: "reject",
                            reason: rejectReason,
                          })
                        }
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
                  {item.status === "approved" && (
                    <button
                      type="button"
                      className={operationButtonClass}
                      onClick={() =>
                        mutate({ id: item.id, action: "complete" })
                      }
                    >
                      완료
                    </button>
                  )}
                  {["pending", "approved"].includes(item.status) && (
                    <OperationReasonDialog
                      title="오프보딩 요청을 취소할까요?"
                      description="필요한 경우 취소 메모를 남길 수 있습니다."
                      label="취소 메모"
                      confirmLabel="요청 취소"
                      required={false}
                      onConfirm={(reason) =>
                        mutate({
                          id: item.id,
                          action: "cancel",
                          reason,
                        })
                      }
                    >
                      <button
                        type="button"
                        className={operationDangerButtonClass}
                      >
                        취소
                      </button>
                    </OperationReasonDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </OperationsSection>

      {selected && (
        <OperationsSection title={`${selected.member.full_name} 체크리스트`}>
          <form
            className="mb-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              mutate({
                id: selected.id,
                action: "add_checklist",
                title: checkTitle,
                responsibleParty,
              }).then(() => {
                setCheckTitle("");
                setResponsibleParty("");
              });
            }}
          >
            <input
              required
              aria-label="체크 항목"
              name="checklistTitle"
              value={checkTitle}
              onChange={(event) => setCheckTitle(event.target.value)}
              className={operationInputClass}
              placeholder="예: 장비 반납 확인…"
            />
            <input
              aria-label="체크 항목 담당자 또는 팀"
              name="responsibleParty"
              value={responsibleParty}
              onChange={(event) => setResponsibleParty(event.target.value)}
              className={operationInputClass}
              placeholder="예: 경영지원팀…"
            />
            <button disabled={busy} className={operationButtonClass}>
              추가
            </button>
          </form>
          {selected.checklist.length === 0 ? (
            <OperationEmpty>체크 항목이 없습니다.</OperationEmpty>
          ) : (
            <div className="space-y-2">
              {selected.checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3"
                >
                  {item.is_completed ? (
                    <button
                      type="button"
                      className={operationSecondaryButtonClass}
                      onClick={() =>
                        mutate({
                          id: selected.id,
                          itemId: item.id,
                          action: "update_checklist",
                          title: item.title,
                          responsibleParty: item.responsible_party,
                          isCompleted: false,
                          completionNote: "",
                        })
                      }
                    >
                      완료 취소
                    </button>
                  ) : (
                    <OperationReasonDialog
                      title="체크 항목을 완료할까요?"
                      description="필요한 경우 완료 메모를 남길 수 있습니다."
                      label="완료 메모"
                      confirmLabel="완료 처리"
                      required={false}
                      onConfirm={(completionNote) =>
                        mutate({
                          id: selected.id,
                          itemId: item.id,
                          action: "update_checklist",
                          title: item.title,
                          responsibleParty: item.responsible_party,
                          isCompleted: true,
                          completionNote,
                        })
                      }
                    >
                      <button
                        type="button"
                        className={operationSecondaryButtonClass}
                      >
                        완료
                      </button>
                    </OperationReasonDialog>
                  )}
                  <span className="flex-1 text-sm">
                    {item.title}
                    {item.responsible_party && ` · ${item.responsible_party}`}
                  </span>
                  <OperationConfirmDialog
                    title="체크 항목을 삭제할까요?"
                    description="삭제한 체크 항목은 복구할 수 없습니다."
                    confirmLabel="항목 삭제"
                    onConfirm={() =>
                      mutate({
                        id: selected.id,
                        itemId: item.id,
                        action: "delete_checklist",
                      })
                    }
                  >
                    <button
                      type="button"
                      className={operationDangerButtonClass}
                    >
                      삭제
                    </button>
                  </OperationConfirmDialog>
                </div>
              ))}
            </div>
          )}
        </OperationsSection>
      )}
      <OperationPagination
        page={page}
        hasMore={hasMore}
        disabled={loading || busy}
        onPageChange={setPage}
      />
    </OperationsPage>
  );
}
