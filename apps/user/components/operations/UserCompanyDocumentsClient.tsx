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
import {
  COMPANY_DOCUMENT_CATEGORIES,
  COMPANY_DOCUMENT_CATEGORY_LABELS,
} from "utils/company-operations";
import { operationRequest } from "./client";

type CompanyDocument = {
  id: string;
  title: string;
  category: (typeof COMPANY_DOCUMENT_CATEGORIES)[number];
  description: string | null;
  note: string | null;
  file_name: string;
  size_bytes: number;
  status: string;
  rejection_reason: string | null;
  published_at: string | null;
  created_at: string;
};
const labels: Record<string, string> = {
  pending: "검토 대기",
  published: "게시",
  rejected: "반려",
  cancelled: "취소",
  archived: "보관",
};

export function UserCompanyDocumentsClient() {
  const [published, setPublished] = useState<CompanyDocument[]>([]);
  const [submissions, setSubmissions] = useState<CompanyDocument[]>([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<(typeof COMPANY_DOCUMENT_CATEGORIES)[number]>("other");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterCategory) params.set("category", filterCategory);
        if (query.trim()) params.set("q", query.trim());
        params.set("page", String(page));
        const data = await operationRequest<{
          published: CompanyDocument[];
          submissions: CompanyDocument[];
          pagination: { hasMore: boolean };
        }>(`/api/company-documents?${params}`, { signal });
        setPublished(data.published);
        setSubmissions(data.submissions);
        setHasMore(data.pagination.hasMore);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [filterCategory, page, query],
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
    setTitle("");
    setCategory("other");
    setDescription("");
    setNote("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const file = fileRef.current?.files?.[0];
      if (!editingId && !file) throw new Error("자료 파일을 선택해주세요.");
      const formData = new FormData();
      if (editingId) {
        formData.set("id", editingId);
        formData.set("action", "update");
      }
      formData.set("title", title);
      formData.set("category", category);
      formData.set("description", description);
      formData.set("note", note);
      if (file) formData.set("file", file);
      await operationRequest("/api/company-documents", {
        method: editingId ? "PATCH" : "POST",
        body: formData,
      });
      toast.success(
        editingId ? "제출 정보를 수정했습니다." : "자료를 제출했습니다.",
      );
      reset();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "제출에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      await operationRequest("/api/company-documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "cancel" }),
      });
      toast.success("자료 제출을 취소했습니다.");
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
      title="전사 자료실"
      description="게시된 사내 자료를 내려받거나 새 자료를 관리자에게 제출합니다."
    >
      <OperationsSection title="자료 찾기">
        <div className="grid gap-3 md:grid-cols-[200px_1fr]">
          <select
            aria-label="자료 분류 필터"
            value={filterCategory}
            onChange={(event) => {
              setFilterCategory(event.target.value);
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
            aria-label="전사 자료 검색"
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
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {loading ? (
            <div className="md:col-span-2">
              <OperationLoading label="게시 자료를 불러오는 중" />
            </div>
          ) : published.length === 0 ? (
            <div className="md:col-span-2">
              <OperationEmpty>게시된 자료가 없습니다.</OperationEmpty>
            </div>
          ) : (
            published.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <p className="text-xs font-semibold text-slate-400">
                  {COMPANY_DOCUMENT_CATEGORY_LABELS[item.category]}
                </p>
                <h3 className="mt-1 break-words font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {item.description || item.file_name}
                </p>
                <a
                  href={`/api/company-documents?download=${item.id}`}
                  className={`mt-3 ${operationSecondaryButtonClass}`}
                >
                  다운로드
                </a>
              </article>
            ))
          )}
        </div>
      </OperationsSection>

      <OperationsSection title={editingId ? "제출 정보 수정" : "자료 제출"}>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            제목
            <input
              name="title"
              autoComplete="off"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            분류
            <select
              name="category"
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
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            파일
            <input
              ref={fileRef}
              name="file"
              type="file"
              required={!editingId}
              className={`mt-1 ${operationInputClass} py-2`}
            />
          </label>
          <label className="text-sm text-slate-600">
            메모
            <input
              name="note"
              autoComplete="off"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button disabled={busy} className={operationButtonClass}>
              {editingId ? "수정 저장" : "제출"}
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

      <OperationsSection title="나의 제출 이력">
        {loading ? (
          <OperationLoading label="제출 이력을 불러오는 중" />
        ) : submissions.length === 0 ? (
          <OperationEmpty>제출한 자료가 없습니다.</OperationEmpty>
        ) : (
          <div className="space-y-2">
            {submissions.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-slate-950">
                    {item.title}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {item.file_name}
                  </p>
                  {item.rejection_reason && (
                    <p className="mt-1 text-sm text-rose-600">
                      {item.rejection_reason}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <OperationStatus value={item.status} labels={labels} />
                  <a
                    href={`/api/company-documents?download=${item.id}`}
                    className={operationSecondaryButtonClass}
                  >
                    다운로드
                  </a>
                  {item.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className={operationSecondaryButtonClass}
                        onClick={() => {
                          setEditingId(item.id);
                          setTitle(item.title);
                          setCategory(item.category);
                          setDescription(item.description ?? "");
                          setNote(item.note ?? "");
                        }}
                      >
                        수정
                      </button>
                      <OperationConfirmDialog
                        title="자료 제출을 취소할까요?"
                        description="취소한 제출은 관리자 검토 대상에서 제외됩니다."
                        confirmLabel="제출 취소"
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
