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
} from "@repo/ui/src/operations";
import { operationRequest } from "./client";

type ChecklistItem = {
  id: string;
  title: string;
  description: string | null;
  responsible_party: string | null;
  is_completed: boolean;
  completion_note: string | null;
  completed_at: string | null;
  sort_order: number;
};
type OnboardingRequest = {
  id: string;
  start_date: string;
  note: string | null;
  admin_note: string | null;
  status: string;
  created_at: string;
  checklist: ChecklistItem[];
};

const labels: Record<string, string> = {
  in_progress: "진행 중",
  completed: "완료",
  cancelled: "취소",
};

export function UserOnboardingClient() {
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await operationRequest<{
        requests: OnboardingRequest[];
        pagination: { hasMore: boolean };
      }>(`/api/onboarding?page=${page}`);
      setRequests(data.requests);
      setHasMore(data.pagination.hasMore);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, [load]);

  async function patch(payload: Record<string, unknown>, message: string) {
    setBusy(true);
    try {
      await operationRequest("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success(message);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "처리에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationsPage
      title="온보딩"
      description="입사 후 진행할 항목을 확인하고 완료되면 직접 체크합니다."
    >
      <OperationsSection title="나의 온보딩">
        {loading ? (
          <OperationLoading label="온보딩 정보를 불러오는 중" />
        ) : requests.length === 0 ? (
          <OperationEmpty>진행 중인 온보딩이 없습니다.</OperationEmpty>
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
                      시작일 {item.start_date}
                    </p>
                    {item.note && (
                      <p className="mt-1 text-sm text-slate-600">{item.note}</p>
                    )}
                  </div>
                  <OperationStatus value={item.status} labels={labels} />
                </div>
                {item.admin_note && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {item.admin_note}
                  </p>
                )}
                {item.checklist.length > 0 && (
                  <>
                    <ul className="mt-4 space-y-2">
                      {[...item.checklist]
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((check) => (
                          <li
                            key={check.id}
                            className="flex items-start gap-2 text-sm text-slate-600"
                          >
                            <input
                              type="checkbox"
                              aria-label={check.title}
                              checked={check.is_completed}
                              disabled={busy || item.status !== "in_progress"}
                              onChange={(event) =>
                                patch(
                                  {
                                    id: item.id,
                                    action: "check_item",
                                    itemId: check.id,
                                    isCompleted: event.target.checked,
                                    completionNote: check.completion_note,
                                  },
                                  event.target.checked
                                    ? "항목을 완료했습니다."
                                    : "완료를 해제했습니다.",
                                )
                              }
                              className="mt-0.5 h-4 w-4 shrink-0 accent-slate-900"
                            />
                            <span className="min-w-0 flex-1">
                              {check.title}
                              {check.responsible_party &&
                                ` · ${check.responsible_party}`}
                              {check.completion_note &&
                                ` · ${check.completion_note}`}
                              {check.description && (
                                <span className="mt-1 block whitespace-pre-wrap text-slate-500">
                                  {check.description}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                    </ul>
                    {item.status === "in_progress" && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <OperationConfirmDialog
                          title="온보딩을 완료할까요?"
                          description="완료 후에는 체크리스트를 수정할 수 없습니다."
                          confirmLabel="온보딩 완료"
                          onConfirm={() =>
                            patch(
                              { id: item.id, action: "complete" },
                              "온보딩을 완료했습니다.",
                            )
                          }
                        >
                          <button
                            type="button"
                            disabled={
                              busy ||
                              item.checklist.some(
                                (check) => !check.is_completed,
                              )
                            }
                            className={operationButtonClass}
                          >
                            온보딩 완료
                          </button>
                        </OperationConfirmDialog>
                        {item.checklist.some(
                          (check) => !check.is_completed,
                        ) && (
                          <p className="text-xs text-slate-500">
                            남은 항목을 모두 체크하면 완료할 수 있습니다.
                          </p>
                        )}
                      </div>
                    )}
                  </>
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
