"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  COMPANY_DOCUMENT_CATEGORIES,
  COMPANY_DOCUMENT_CATEGORY_LABELS,
} from "utils/company-operations";
import { adminOperationRequest } from "./client";

type Member = { id: string; full_name: string };
type Document = {
  id: string;
  submitted_by: string;
  title: string;
  category: (typeof COMPANY_DOCUMENT_CATEGORIES)[number];
  description: string | null;
  note: string | null;
  file_name: string;
  size_bytes: number;
  status: string;
  rejection_reason: string | null;
  submitter: Member;
};
const labels: Record<string, string> = {
  pending: "검토 대기",
  published: "게시",
  rejected: "반려",
  cancelled: "취소",
  archived: "보관",
};

export function AdminCompanyDocumentsClient() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submittedBy, setSubmittedBy] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<(typeof COMPANY_DOCUMENT_CATEGORIES)[number]>("other");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [publish, setPublish] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (statusFilter) params.set("status", statusFilter);
        if (categoryFilter) params.set("category", categoryFilter);
        if (query.trim()) params.set("q", query.trim());
        const data = await adminOperationRequest<{
          documents: Document[];
          members: Member[];
          pagination: { hasMore: boolean };
        }>(`/api/company-documents?${params}`, { signal });
        setDocuments(data.documents);
        setMembers(data.members);
        setHasMore(data.pagination.hasMore);
        setSubmittedBy((current) => current || data.members[0]?.id || "");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [categoryFilter, page, query, statusFilter],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((error) => {
      if (error.name !== "AbortError") toast.error(error.message);
    });
    return () => controller.abort();
  }, [load]);

  function reset() {
    setEditingId(null);
    setSubmittedBy(members[0]?.id ?? "");
    setTitle("");
    setCategory("other");
    setDescription("");
    setNote("");
    setPublish(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function call(
    method: "PATCH" | "DELETE",
    body?: Record<string, unknown>,
    id?: string,
  ) {
    setBusy(true);
    try {
      await adminOperationRequest(
        method === "DELETE"
          ? `/api/company-documents?id=${id}`
          : "/api/company-documents",
        {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        },
      );
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
      if (editingId) {
        await adminOperationRequest("/api/company-documents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            action: "update",
            title,
            category,
            description,
            note,
          }),
        });
      } else {
        const file = fileRef.current?.files?.[0];
        if (!file) throw new Error("자료 파일을 선택해주세요.");
        const formData = new FormData();
        formData.set("submittedBy", submittedBy);
        formData.set("title", title);
        formData.set("category", category);
        formData.set("description", description);
        formData.set("note", note);
        formData.set("publish", String(publish));
        formData.set("file", file);
        await adminOperationRequest("/api/company-documents", {
          method: "POST",
          body: formData,
        });
      }
      toast.success(
        editingId ? "자료 정보를 수정했습니다." : "자료를 등록했습니다.",
      );
      reset();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function replace(id: string, file: File) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("file", file);
      await adminOperationRequest("/api/company-documents", {
        method: "PUT",
        body: formData,
      });
      toast.success("파일을 교체했습니다.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "교체에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationsPage
      variant="admin"
      title="전사 자료실 관리"
      description="자료 제출을 검토하고 게시·교체·보관합니다."
    >
      <OperationsSection
        key={editingId ?? "new-document"}
        title={editingId ? "자료 정보 수정" : "자료 등록"}
        collapsible
        defaultOpen={Boolean(editingId)}
      >
        <form onSubmit={save} className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-600">
            제출자
            <select
              disabled={Boolean(editingId)}
              value={submittedBy}
              onChange={(event) => setSubmittedBy(event.target.value)}
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
            제목
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            분류
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as typeof category)
              }
              className={`mt-1 ${operationInputClass}`}
            >
              {COMPANY_DOCUMENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {COMPANY_DOCUMENT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            설명
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            메모
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            파일
            <input
              ref={fileRef}
              type="file"
              required={!editingId}
              disabled={Boolean(editingId)}
              className={`mt-1 ${operationInputClass} py-2`}
            />
          </label>
          {!editingId && (
            <label className="flex items-center gap-2 self-end text-sm text-slate-600">
              <input
                type="checkbox"
                checked={publish}
                onChange={(event) => setPublish(event.target.checked)}
              />
              등록 즉시 게시
            </label>
          )}
          <div className="flex gap-2 md:col-span-3">
            <button disabled={busy} className={operationButtonClass}>
              저장
            </button>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                className={operationSecondaryButtonClass}
              >
                새 자료
              </button>
            )}
          </div>
        </form>
      </OperationsSection>

      <OperationsSection title="자료 필터">
        <div className="grid gap-3 md:grid-cols-3">
          <select
            aria-label="자료 상태 필터"
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
          <select
            aria-label="자료 분류 필터"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
            }}
            className={operationInputClass}
          >
            <option value="">전체 분류</option>
            {COMPANY_DOCUMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {COMPANY_DOCUMENT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          <input
            aria-label="자료 제목 또는 설명 검색"
            name="documentSearch"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            className={operationInputClass}
            placeholder="예: 취업규칙…"
          />
        </div>
      </OperationsSection>

      <OperationsSection title="전체 자료">
        {loading ? (
          <OperationLoading label="전사 자료를 불러오는 중" />
        ) : documents.length === 0 ? (
          <OperationEmpty>조건에 맞는 자료가 없습니다.</OperationEmpty>
        ) : (
          <div className="space-y-2">
            {documents.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-500">
                      {item.submitter?.full_name} ·{" "}
                      {COMPANY_DOCUMENT_CATEGORY_LABELS[item.category]} ·{" "}
                      {item.file_name}
                    </p>
                    {item.rejection_reason && (
                      <p className="mt-1 text-sm text-rose-600">
                        {item.rejection_reason}
                      </p>
                    )}
                  </div>
                  <OperationStatus value={item.status} labels={labels} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/company-documents?download=${item.id}`}
                    className={operationSecondaryButtonClass}
                  >
                    다운로드
                  </a>
                  <button
                    type="button"
                    className={operationSecondaryButtonClass}
                    onClick={() => {
                      setEditingId(item.id);
                      setSubmittedBy(item.submitted_by);
                      setTitle(item.title);
                      setCategory(item.category);
                      setDescription(item.description ?? "");
                      setNote(item.note ?? "");
                    }}
                  >
                    정보 수정
                  </button>
                  <label className={operationSecondaryButtonClass}>
                    파일 교체
                    <input
                      type="file"
                      className="sr-only"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) replace(item.id, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {["pending", "rejected"].includes(item.status) && (
                    <button
                      type="button"
                      className={operationButtonClass}
                      onClick={() =>
                        call("PATCH", { id: item.id, action: "publish" })
                      }
                    >
                      게시
                    </button>
                  )}
                  {item.status === "pending" && (
                    <OperationReasonDialog
                      title="자료를 반려할까요?"
                      description="제출자에게 표시할 반려 사유를 입력해주세요."
                      label="반려 사유"
                      confirmLabel="반려"
                      onConfirm={(reason) =>
                        call("PATCH", {
                          id: item.id,
                          action: "reject",
                          reason,
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
                  )}
                  {["published", "rejected", "cancelled"].includes(
                    item.status,
                  ) && (
                    <button
                      type="button"
                      className={operationSecondaryButtonClass}
                      onClick={() =>
                        call("PATCH", { id: item.id, action: "archive" })
                      }
                    >
                      보관
                    </button>
                  )}
                  {["pending", "rejected", "cancelled"].includes(
                    item.status,
                  ) && (
                    <OperationConfirmDialog
                      title="자료를 삭제할까요?"
                      description="삭제한 자료와 파일은 복구할 수 없습니다."
                      confirmLabel="자료 삭제"
                      onConfirm={() => call("DELETE", undefined, item.id)}
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
