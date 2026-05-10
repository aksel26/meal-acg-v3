"use client";

import { MessageSquare, Paperclip } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  RelatedRequestSummary,
  LinkedProjectSummary,
  RequestAttachment,
  RequestComment,
  RequestEvent,
  RequestRecord,
  RequestStatus,
} from "@/lib/requests";
import type { SessionUser } from "@/lib/auth";
import { PriorityBadge, StatusBadge } from "@/components/requests/RequestBadge";

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
  const [completionNote, setCompletionNote] = useState(request.completion_note ?? "");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const assignees = displayAssigneeNames(request);
  const teamNames = displayTeamNames(request);
  const customerNames = displayCustomerNames(request);
  const affiliateNames = displayAffiliateNames(request);
  const isUnassigned = assignees === "미배정";

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
            <select
              className="h-9 shrink-0 rounded-md border border-[#e5e7eb] bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#111111]"
              disabled={submitting}
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

          {isUnassigned && (
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
          <p className="mt-1 text-xs text-slate-400">완료 처리 시 5자 이상 필수</p>
          <textarea
            className={`mt-3 min-h-24 resize-y ${inputClass}`}
            value={completionNote}
            onChange={(event) => setCompletionNote(event.target.value)}
            placeholder="완료 처리 시 결과를 간단히 남겨주세요."
          />
          <div className="mt-3 flex justify-end">
            <button
              className={primaryBtnClass}
              disabled={submitting}
              onClick={() => updateStatus("완료")}
              type="button"
            >
              완료 처리
            </button>
          </div>
        </div>

        <div className={`${panelClass} p-5`}>
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-slate-400" />
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
              <Paperclip size={15} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-[#111111]">첨부파일</h2>
              {attachments.length > 0 && (
                <span className="text-xs text-slate-400">{attachments.length}</span>
              )}
            </div>
            <label className="cursor-pointer rounded-md bg-[#f9f9fa] px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-[#f3f3f3]">
              추가
              <input className="sr-only" multiple type="file" onChange={uploadFiles} />
            </label>
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
          <h2 className="text-sm font-semibold text-[#111111]">변경 이력</h2>
          <div className="mt-3 space-y-2.5">
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
            <h2 className="text-sm font-semibold text-[#111111]">다른 요청</h2>
            {relatedRequests.length > 0 && (
              <span className="text-xs text-slate-400">
                {relatedRequests.length.toLocaleString("ko-KR")}건
              </span>
            )}
          </div>

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
