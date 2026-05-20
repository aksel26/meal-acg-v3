"use client";

import { MessageSquare, Paperclip, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { toast } from "@repo/ui/src/sonner";
import type {
  RelatedRequestSummary,
  CompletionMemo,
  LinkedProjectSummary,
  RequestAttachment,
  RequestComment,
  RequestEvent,
  RequestRecord,
  RequestStatus,
} from "@/lib/requests";
import type { SessionUser } from "@/lib/auth";
import { PriorityBadge, StatusBadge } from "@/components/requests/RequestBadge";
import { RequestForm } from "@/components/requests/RequestForm";

const statuses: RequestStatus[] = ["접수", "진행", "대기", "완료", "거절"];

const panelClass = "rounded-xl border border-[#f3f3f3] bg-white";
const inputClass =
  "w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 outline-none transition-colors focus:border-[#111111]";
const primaryBtnClass =
  "h-9 rounded-md bg-[#111111] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50";

export function RequestDetailClient({
  request,
  comments,
  attachments,
  events,
  currentUser,
  relatedRequests,
  linkedProjects,
}: {
  request: RequestRecord;
  comments: RequestComment[];
  attachments: RequestAttachment[];
  events: RequestEvent[];
  currentUser: SessionUser;
  relatedRequests: RelatedRequestSummary[];
  linkedProjects: LinkedProjectSummary[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [completionNote, setCompletionNote] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showCompletionWarning, setShowCompletionWarning] = useState(false);
  const [editingCompletionMemoId, setEditingCompletionMemoId] = useState<string | null>(null);
  const [editingCompletionMemoBody, setEditingCompletionMemoBody] = useState("");
  const [deletingCompletionMemoId, setDeletingCompletionMemoId] = useState<string | null>(null);

  async function updateStatus(nextStatus: RequestStatus) {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          completionNote: nextStatus === "완료" ? completionNote : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "상태 변경에 실패했습니다.");
      }
      setStatus(payload.status);
      if (nextStatus === "완료") {
        setCompletionNote("");
      }
      router.refresh();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "상태 변경에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function assignToMe() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assigneeId: currentUser.id,
          assigneeName: currentUser.fullName,
          assigneeIds: [currentUser.id],
          assigneeNames: [currentUser.fullName],
          status: status === "접수" ? "진행" : status,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "담당자 지정에 실패했습니다.");
      }
      setStatus(payload.status);
      router.refresh();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "담당자 지정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${request.id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: comment }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "댓글 작성에 실패했습니다.");
      }
      setComment("");
      router.refresh();
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "댓글 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setError(null);
    setSubmitting(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`/api/requests/${request.id}/attachments`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error || `${file.name} 업로드에 실패했습니다.`);
        }
      }
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "첨부 업로드에 실패했습니다.");
    } finally {
      setSubmitting(false);
      event.target.value = "";
    }
  }

  async function deleteRequest() {
    if (!window.confirm("이 요청을 삭제하시겠습니까?")) return;

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "요청 삭제에 실패했습니다.");
      }
      router.push("/requests");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "요청 삭제에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateCompletionMemo(memoId: string) {
    const body = editingCompletionMemoBody.trim();
    if (body.length < 5) {
      toast.error("완료 메모는 5자 이상 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${request.id}/completion-memos/${memoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "완료 메모 수정에 실패했습니다.");
      }
      setEditingCompletionMemoId(null);
      setEditingCompletionMemoBody("");
      router.refresh();
    } catch (memoError) {
      toast.error(memoError instanceof Error ? memoError.message : "완료 메모 수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteCompletionMemo(memoId: string) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${request.id}/completion-memos/${memoId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "완료 메모 삭제에 실패했습니다.");
      }
      if (editingCompletionMemoId === memoId) {
        setEditingCompletionMemoId(null);
        setEditingCompletionMemoBody("");
      }
      setDeletingCompletionMemoId(null);
      router.refresh();
    } catch (memoError) {
      toast.error(memoError instanceof Error ? memoError.message : "완료 메모 삭제에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const assignees = displayAssigneeNames(request);
  const teamNames = displayTeamNames(request);
  const customerNames = displayCustomerNames(request);
  const affiliateNames = displayAffiliateNames(request);
  const isUnassigned = assignees === "미배정";
  const canEdit = request.requester_id === currentUser.id;
  const completionMemos = getCompletionMemos(events);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <div className={`${panelClass} p-5`}>
          <div className="flex flex-col gap-4 border-b border-[#f3f3f3] pb-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-1.5">
                <StatusBadge status={status} />
                <PriorityBadge priority={request.priority} />
              </div>
              <h1 className="text-xl font-semibold text-[#111111]">{request.title}</h1>
              <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <MetaItem label="요청자" value={request.requester_name} />
                <MetaItem label="담당" value={assignees} />
                {teamNames && <MetaItem label="담당팀" value={teamNames} />}
                {customerNames && <MetaItem label="고객사" value={customerNames} />}
                {affiliateNames && <MetaItem label="계열사" value={affiliateNames} />}
                {request.request_type_name && (
                  <MetaItem label="유형" value={request.request_type_name} />
                )}
                {request.due_date && <MetaItem label="마감" value={request.due_date} />}
              </dl>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canEdit && (
                <>
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-[#f9f9fa] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={submitting}
                    onClick={() => setEditOpen(true)}
                    type="button"
                  >
                    <Pencil size={15} strokeWidth={1.5} />
                    수정
                  </button>
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={submitting}
                    onClick={deleteRequest}
                    type="button"
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                    삭제
                  </button>
                </>
              )}
              <select
                className="h-9 rounded-md border border-[#e5e7eb] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#111111]"
                disabled={submitting || !canEdit}
                value={status}
                onChange={(event) => updateStatus(event.target.value as RequestStatus)}
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {canEdit && isUnassigned && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg bg-[#f9f9fa] px-3 py-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-600">
                아직 담당자가 없습니다. 내게 배정하면 내 요청 목록에 표시됩니다.
              </p>
              <button
                className={`${primaryBtnClass} shrink-0`}
                disabled={submitting}
                onClick={assignToMe}
                type="button"
              >
                내게 배정
              </button>
            </div>
          )}

          <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {request.body || (
              <span className="text-slate-400">요청 내용이 없습니다.</span>
            )}
          </div>
        </div>

        <div className={`${panelClass} p-5`}>
          <h2 className="text-sm font-semibold text-[#111111]">완료 메모</h2>
          {canEdit && (
            <>
              <textarea
                className={`mt-3 min-h-24 resize-y ${inputClass}`}
                value={completionNote}
                onChange={(event) => {
                  setCompletionNote(event.target.value);
                  if (event.target.value.trim().length >= 5) {
                    setShowCompletionWarning(false);
                  }
                }}
                placeholder="완료 처리 시 결과를 간단히 남겨주세요."
              />
              {showCompletionWarning && (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  완료 처리에는 5자 이상의 완료 메모가 필요합니다.
                </p>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  className={primaryBtnClass}
                  disabled={submitting}
                  onClick={() => {
                    if (completionNote.trim().length < 5) {
                      setShowCompletionWarning(true);
                      return;
                    }
                    setShowCompletionWarning(false);
                    updateStatus("완료");
                  }}
                  type="button"
                >
                  완료 처리
                </button>
              </div>
            </>
          )}

          <div className={canEdit ? "mt-5 border-t border-[#f3f3f3] pt-4" : "mt-3"}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#111111]">완료 메모 목록</h3>
              {completionMemos.length > 0 && (
                <span className="text-xs text-slate-400">{completionMemos.length}</span>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {completionMemos.length === 0 ? (
                <p className="rounded-lg bg-[#fafafa] px-3 py-3 text-sm text-slate-500">
                  아직 등록된 완료 메모가 없습니다.
                </p>
              ) : (
                completionMemos.map((memo) => (
                  <div
                    key={memo.id}
                    className="rounded-lg border border-[#f3f3f3] bg-[#fafafa] px-3 py-3"
                  >
                    <div className="flex flex-col gap-1 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{memo.author_name}</span>
                        {memo.edited_at && (
                          <span
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                            title={`${formatDateTime(memo.edited_at)}${
                              memo.edited_by_name ? ` · ${memo.edited_by_name}` : ""
                            }`}
                          >
                            수정됨
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="tabular-nums text-slate-500">
                          {formatDateTime(memo.created_at)}
                        </span>
                        {canEdit && memo.editable && (
                          <div className="flex items-center gap-1">
                            <button
                              aria-label="완료 메모 수정"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={submitting}
                              onClick={() => {
                                setEditingCompletionMemoId(memo.id);
                                setEditingCompletionMemoBody(memo.body);
                              }}
                              title="수정"
                              type="button"
                            >
                              <Pencil size={14} strokeWidth={1.5} />
                            </button>
                            <button
                              aria-label="완료 메모 삭제"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={submitting}
                              onClick={() => setDeletingCompletionMemoId(memo.id)}
                              title="삭제"
                              type="button"
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {editingCompletionMemoId === memo.id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          className={`min-h-20 resize-y ${inputClass}`}
                          value={editingCompletionMemoBody}
                          onChange={(event) => setEditingCompletionMemoBody(event.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            className="h-8 rounded-md border border-[#e5e7eb] bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-[#f9f9fa] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={submitting}
                            onClick={() => {
                              setEditingCompletionMemoId(null);
                              setEditingCompletionMemoBody("");
                            }}
                            type="button"
                          >
                            취소
                          </button>
                          <button
                            className="h-8 rounded-md bg-[#111111] px-3 text-xs font-medium text-white transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={submitting}
                            onClick={() => updateCompletionMemo(memo.id)}
                            type="button"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {memo.body}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={`${panelClass} p-5`}>
          <div className="flex items-center gap-2">
            <MessageSquare size={15} strokeWidth={1.5} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-[#111111]">댓글</h2>
            {comments.length > 0 && (
              <span className="text-xs text-slate-400">{comments.length}</span>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500">아직 댓글이 없습니다.</p>
            ) : (
              comments.map((item) => (
                <div key={item.id} className="rounded-lg bg-[#fafafa] px-3 py-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{item.author_name}</span>
                    <span>{new Date(item.created_at).toLocaleString("ko-KR")}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {item.body}
                  </p>
                </div>
              ))
            )}
          </div>

          {canEdit && (
            <form className="mt-4 space-y-3" onSubmit={addComment}>
              <textarea
                className={`min-h-24 resize-y ${inputClass}`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="진행 상황이나 확인이 필요한 내용을 남겨주세요."
              />
              <div className="flex justify-end">
                <button
                  className={primaryBtnClass}
                  disabled={submitting || !comment.trim()}
                  type="submit"
                >
                  댓글 등록
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Paperclip size={15} strokeWidth={1.5} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-[#111111]">첨부파일</h2>
              {attachments.length > 0 && (
                <span className="text-xs text-slate-400">{attachments.length}</span>
              )}
            </div>
            {canEdit && (
              <label className="cursor-pointer rounded-md bg-[#f9f9fa] px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-[#f3f3f3]">
                추가
                <input className="sr-only" multiple type="file" onChange={uploadFiles} />
              </label>
            )}
          </div>
          <div className="mt-3 space-y-1.5">
            {attachments.length === 0 ? (
              <p className="text-sm text-slate-500">첨부파일이 없습니다.</p>
            ) : (
              attachments.map((item) => (
                <div key={item.id} className="rounded-md bg-[#fafafa] px-3 py-2">
                  <p className="truncate text-sm font-medium text-slate-700">{item.file_name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {(item.size_bytes / 1024).toFixed(1)}KB · {item.uploaded_by_name}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#111111]">변경 이력</h2>
            {events.length > 0 && (
              <span className="text-xs text-slate-400">{events.length}건</span>
            )}
          </div>
          <div className="mt-3 max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">이력이 없습니다.</p>
            ) : (
              events.map((item) => (
                <div key={item.id} className="text-sm">
                  <p className="font-medium text-slate-700">{eventLabel(item.event_type)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.actor_name} · {new Date(item.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#111111]">연결 프로젝트</h2>
            {linkedProjects.length > 0 && (
              <span className="text-xs text-slate-400">{linkedProjects.length}건</span>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {linkedProjects.length === 0 ? (
              <p className="text-sm text-slate-500">연결된 프로젝트가 없습니다.</p>
            ) : (
              linkedProjects.map((project) => (
                <Link
                  key={project.id}
                  className="block rounded-md bg-[#fafafa] px-3 py-2 transition-colors hover:bg-[#f3f3f3]"
                  href={`/projects/${project.id}`}
                >
                  <p className="truncate text-sm font-medium text-[#111111]">
                    {project.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {project.customer_names?.join(", ") || "고객사 미지정"}
                    {project.due_date ? ` · 마감 ${project.due_date}` : ""}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-sm font-semibold text-[#111111]">
              {customerNames ? `${customerNames} 관련 다른 요청` : "고객사 관련 다른 요청"}
            </h2>
            {relatedRequests.length > 0 && (
              <span className="shrink-0 text-xs text-slate-400">
                {relatedRequests.length.toLocaleString("ko-KR")}건
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            현재 요청과 동일한 고객사의 요청만 표시됩니다.
          </p>

          <ul className="mt-3 divide-y divide-[#f3f3f3]">
            {relatedRequests.length === 0 ? (
              <li className="py-3 text-sm text-slate-500">표시할 요청이 없습니다.</li>
            ) : (
              relatedRequests.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/requests/${item.id}`}
                    className="flex flex-col gap-1.5 rounded-md px-2 py-2.5 transition-colors hover:bg-[#f9f9fa]"
                  >
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={item.status} />
                      <PriorityBadge priority={item.priority} />
                    </div>
                    <p className="truncate text-sm font-medium text-[#111111]">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.requester_name}
                      {item.due_date ? ` · 마감 ${item.due_date}` : ""}
                      {" · "}
                      {formatRequestDate(item.created_at)}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </aside>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          className="max-h-[85vh] gap-0 overflow-hidden p-0"
          style={{ maxWidth: "min(900px, calc(100% - 2rem))" }}
        >
          <DialogHeader className="border-b border-[#f3f3f3] px-5 py-4">
            <DialogTitle>요청 수정</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(85vh-73px)] overflow-y-auto px-5 py-5">
            <RequestForm
              initialRequest={request}
              onSuccess={() => setEditOpen(false)}
              submitLabel="수정 저장"
              datePickerModal
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingCompletionMemoId !== null}
        onOpenChange={(open) => {
          if (!open && !submitting) setDeletingCompletionMemoId(null);
        }}
      >
        <DialogContent className="gap-0 p-0" style={{ maxWidth: "min(440px, calc(100% - 2rem))" }}>
          <DialogHeader className="border-b border-[#f3f3f3] px-5 py-4">
            <DialogTitle>완료 메모 삭제</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500">
              이 완료 메모를 삭제하시겠습니까? 삭제된 메모는 변경 이력에서만 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 px-5 py-4">
            <button
              className="h-9 rounded-md border border-[#e5e7eb] bg-white px-3.5 text-sm font-medium text-slate-600 transition-colors hover:bg-[#f9f9fa] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              onClick={() => setDeletingCompletionMemoId(null)}
              type="button"
            >
              취소
            </button>
            <button
              className="h-9 rounded-md bg-rose-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting || !deletingCompletionMemoId}
              onClick={() => {
                if (deletingCompletionMemoId) {
                  void deleteCompletionMemo(deletingCompletionMemoId);
                }
              }}
              type="button"
            >
              삭제
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatRequestDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCompletionMemos(events: RequestEvent[]): CompletionMemo[] {
  const memoChangesById = new Map<
    string,
    { body: string | null; editedAt: string; editedByName: string | null; deletedAt: string | null }
  >();

  for (const event of events) {
    if (
      event.event_type !== "completion_note_edited" &&
      event.event_type !== "completion_note_deleted"
    ) {
      continue;
    }
    const memoId = getStringValue(event.before, "memoId") || getStringValue(event.after, "memoId");
    if (!memoId) continue;

    if (event.event_type === "completion_note_deleted") {
      memoChangesById.set(memoId, {
        body: null,
        editedAt: event.created_at,
        editedByName: event.actor_name,
        deletedAt: event.created_at,
      });
      continue;
    }

    const afterBody = getStringValue(event.after, "body");
    memoChangesById.set(memoId, {
      body: afterBody,
      editedAt: event.created_at,
      editedByName: event.actor_name,
      deletedAt: null,
    });
  }

  return events
    .flatMap<CompletionMemo>((event) => {
      if (event.event_type === "completion_note_created") {
        if (getStringValue(event.after, "deletedAt")) return [];
        const body = getStringValue(event.after, "body");
        if (!body) return [];
        const editedAt = getStringValue(event.after, "editedAt");
        const editedByName = getStringValue(event.after, "editedByName");
        return [
          {
            id: event.id,
            request_id: event.request_id,
            author_name: event.actor_name,
            body,
            created_at: event.created_at,
            editable: true,
            source: "event",
            edited_at: editedAt,
            edited_by_name: editedByName,
          },
        ];
      }

      if (event.event_type === "request_updated") {
        const body = getStringValue(event.after, "completion_note");
        if (!body) return [];
        const change = memoChangesById.get(event.id);
        if (change?.deletedAt) return [];
        return [
          {
            id: event.id,
            request_id: event.request_id,
            author_name: event.actor_name,
            body: change?.body ?? body,
            created_at: event.created_at,
            editable: true,
            source: "legacy",
            edited_at: change?.editedAt ?? null,
            edited_by_name: change?.editedByName ?? null,
          },
        ];
      }

      return [];
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

function getStringValue(source: Record<string, unknown> | null, key: string) {
  const value = source?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
        {label}
      </dt>
      <dd className="text-slate-700">{value}</dd>
    </div>
  );
}

function eventLabel(type: string) {
  if (type === "request_created") return "요청 생성";
  if (type === "request_updated") return "요청 수정";
  if (type === "comment_created") return "댓글 추가";
  if (type === "attachment_uploaded") return "첨부 추가";
  if (type === "completion_note_created") return "완료 메모 작성";
  if (type === "completion_note_edited") return "완료 메모 수정";
  if (type === "completion_note_deleted") return "완료 메모 삭제";
  return type;
}

function displayAssigneeNames(request: RequestRecord) {
  const names =
    request.assignee_names && request.assignee_names.length > 0
      ? request.assignee_names
      : request.assignee_name
        ? [request.assignee_name]
        : [];

  return names.length > 0 ? names.join(", ") : "미배정";
}

function displayTeamNames(request: RequestRecord) {
  const names =
    request.team_names && request.team_names.length > 0
      ? request.team_names
      : request.team_name
        ? [request.team_name]
        : [];

  return names.join(", ");
}

function displayCustomerNames(request: RequestRecord) {
  return request.customer_names?.join(", ") ?? "";
}

function displayAffiliateNames(request: RequestRecord) {
  return request.affiliate_names?.join(", ") ?? "";
}
