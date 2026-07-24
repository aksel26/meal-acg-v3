"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  Download,
  LinkIcon,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import type {
  LinkedRequestSummary,
  ProjectAttachment,
  ProjectChecklistItem,
  ProjectRecord,
  ProjectStatus,
} from "@/lib/projects";
import type { RequestRecord } from "@/lib/requests";
import { PriorityBadge, StatusBadge } from "@/components/requests/RequestBadge";
import { ProjectStatusBadge } from "@/components/projects/ProjectBadge";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";

const PROJECT_STATUSES: ProjectStatus[] = ["계획", "진행", "대기", "완료"];

const cardClass = "rounded-xl border border-[#f3f3f3] bg-white";
const inputClass =
  "w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 outline-none transition-colors focus:border-[#111111]";
const primaryBtnClass =
  "inline-flex h-9 items-center gap-2 rounded-md bg-[#111111] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50";
const ghostBtnClass =
  "inline-flex h-9 items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-50";

export function ProjectDetailClient({
  project,
  linkedRequests,
  checklistItems,
  attachments,
  memberLeaves,
  canEdit,
  canDelete,
}: {
  project: ProjectRecord;
  linkedRequests: LinkedRequestSummary[];
  checklistItems: ProjectChecklistItem[];
  attachments: ProjectAttachment[];
  memberLeaves: Record<string, string>;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function updateStatus(nextStatus: ProjectStatus) {
    if (nextStatus === status) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "상태 변경에 실패했습니다.");
      }
      setStatus(payload.status);
      toast.success("상태가 변경되었습니다.");
      router.refresh();
    } catch (statusError) {
      toast.error(
        statusError instanceof Error ? statusError.message : "상태 변경에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteProject() {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "프로젝트 삭제에 실패했습니다.");
      }
      toast.success("프로젝트를 삭제했습니다.");
      setDeleteOpen(false);
      router.push("/projects");
      router.refresh();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "프로젝트 삭제에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-xs text-slate-500">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-[#f5f5f5] hover:text-[#111111]"
        >
          <ChevronLeft size={13} strokeWidth={1.5} />
          프로젝트 목록
        </Link>
      </nav>

      <HeaderCard
        project={project}
        status={status}
        submitting={submitting}
        canEdit={canEdit}
        canDelete={canDelete}
        onStatusChange={updateStatus}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      <MetaStrip
        project={project}
        checklistItems={checklistItems}
        memberLeaves={memberLeaves}
      />

      <div className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-3">
          <DescriptionCard description={project.description} />
        </div>
        <div className="space-y-4 md:col-span-2">
          <ChecklistPanel projectId={project.id} items={checklistItems} />
          <AttachmentsPanel
            projectId={project.id}
            attachments={attachments}
            canEdit={canEdit}
          />
          <LinkedRequestsPanel projectId={project.id} requests={linkedRequests} />
        </div>
      </div>

      {canEdit && (
        <EditProjectDialog
          project={project}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !submitting) setDeleteOpen(false);
        }}
      >
        <DialogContent
          className="gap-0 p-0"
          style={{ maxWidth: "min(440px, calc(100% - 2rem))" }}
        >
          <DialogHeader className="border-b border-[#f3f3f3] px-5 py-4">
            <DialogTitle>프로젝트 삭제</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500">
              이 프로젝트를 삭제하시겠습니까? 연결된 체크리스트와 요청 연결이 함께 제거되며 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 px-5 py-4">
            <button
              className="h-9 rounded-md border border-[#e5e7eb] bg-white px-3.5 text-sm font-medium text-slate-600 transition-colors hover:bg-[#f9f9fa] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              onClick={() => setDeleteOpen(false)}
              type="button"
            >
              취소
            </button>
            <button
              className="h-9 rounded-md bg-rose-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              onClick={deleteProject}
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

function HeaderCard({
  project,
  status,
  submitting,
  canEdit,
  canDelete,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  project: ProjectRecord;
  status: ProjectStatus;
  submitting: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onStatusChange: (next: ProjectStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`${cardClass} px-6 py-6`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-3">
            <ProjectStatusBadge status={status} />
          </div>
          <h1 className="text-2xl font-semibold leading-tight text-[#111111]">
            {project.title}
          </h1>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex shrink-0 items-center gap-2">
            {canEdit && (
              <button
                aria-label="프로젝트 수정"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-[#f9f9fa] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
                onClick={onEdit}
                type="button"
              >
                <Pencil size={15} strokeWidth={1.5} />
                수정
              </button>
            )}
            {canDelete && (
              <button
                aria-label="프로젝트 삭제"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
                onClick={onDelete}
                type="button"
              >
                <Trash2 size={15} strokeWidth={1.5} />
                삭제
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>등록자 {project.created_by_name}</span>
          <Dot />
          <span>등록 {formatDate(project.created_at)}</span>
          <Dot />
          <span>수정 {formatRelative(project.updated_at)}</span>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {PROJECT_STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              disabled={submitting || !canEdit}
              onClick={() => onStatusChange(item)}
              className={`h-9 min-w-[64px] rounded-md border px-4 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                status === item
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-[#e5e7eb] bg-white text-slate-700 hover:border-slate-300 hover:bg-[#fafafa]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="text-slate-300">·</span>;
}

function MetaStrip({
  project,
  checklistItems,
  memberLeaves,
}: {
  project: ProjectRecord;
  checklistItems: ProjectChecklistItem[];
  memberLeaves: Record<string, string>;
}) {
  const dDay = computeDDay(project.due_date);
  const total = checklistItems.length;
  const done = checklistItems.filter((item) => item.is_done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const sections: { key: string; label: string; content: React.ReactNode }[] = [];

  const hasSchedule = Boolean(project.start_date || project.due_date);
  const hasProgress = total > 0;

  if (hasSchedule || hasProgress) {
    sections.push({
      key: "schedule",
      label: "일정",
      content: (
        <div className="space-y-3">
          {hasSchedule && (
            <div className="space-y-2.5">
              <MetaField label="시작">
                <span className="tabular-nums">{project.start_date ?? "미정"}</span>
              </MetaField>
              <MetaField label="마감">
                <span className="inline-flex items-center gap-1.5">
                  <span className="tabular-nums">{project.due_date ?? "미정"}</span>
                  {dDay && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${dDayToneClass(
                        dDay.tone,
                      )}`}
                    >
                      {dDay.label}
                    </span>
                  )}
                </span>
              </MetaField>
            </div>
          )}
          {hasProgress && (
            <div className={hasSchedule ? "border-t border-[#f3f3f3] pt-3" : ""}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm text-slate-400">진행률</span>
                <span className="text-sm font-medium tabular-nums text-slate-700">
                  {percent}%
                  <span className="ml-1 text-xs text-slate-400">
                    ({done}/{total})
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3f3f3]">
                <div
                  className="h-full rounded-full bg-[#111111] transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ),
    });
  }

  const peopleFields: React.ReactNode[] = [];
  if (project.manager_names.length > 0) {
    peopleFields.push(
      <MetaField key="managers" label="담당자">
        {memberNamesToList(
          project.manager_ids,
          project.manager_names,
          memberLeaves,
        )}
      </MetaField>,
    );
  }
  if (project.stakeholder_names.length > 0) {
    peopleFields.push(
      <MetaField key="stakeholders" label="관련자">
        {memberNamesToList(
          project.stakeholder_ids,
          project.stakeholder_names,
          memberLeaves,
        )}
      </MetaField>,
    );
  }
  if (project.stakeholder_team_names.length > 0) {
    peopleFields.push(
      <MetaField key="teams" label="관련팀">
        {namesToList(project.stakeholder_team_names)}
      </MetaField>,
    );
  }
  if (peopleFields.length > 0) {
    sections.push({
      key: "people",
      label: "관계자",
      content: <div className="space-y-2.5">{peopleFields}</div>,
    });
  }

  const externalFields: React.ReactNode[] = [];
  if (project.customer_names.length > 0) {
    externalFields.push(
      <MetaField key="customers" label="고객사">
        {namesToList(project.customer_names)}
      </MetaField>,
    );
  }
  if (project.affiliate_names.length > 0) {
    externalFields.push(
      <MetaField key="affiliates" label="계열사">
        {namesToList(project.affiliate_names)}
      </MetaField>,
    );
  }
  if (externalFields.length > 0) {
    sections.push({
      key: "external",
      label: "외부",
      content: <div className="space-y-2.5">{externalFields}</div>,
    });
  }

  return (
    <div
      className={`${cardClass} flex flex-col divide-y divide-[#f3f3f3] md:flex-row md:divide-x md:divide-y-0`}
    >
      {sections.map((section) => (
        <div key={section.key} className="min-w-0 flex-1 px-7 py-6">
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-slate-400">
            {section.label}
          </h3>
          {section.content}
        </div>
      ))}
    </div>
  );
}

function MetaField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-1.5 text-sm">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-slate-300">-</span>
      <span className="min-w-0 flex-1 truncate text-slate-700">{children}</span>
    </div>
  );
}

function namesToList(names: string[]) {
  const filtered = names.filter(Boolean);
  if (filtered.length === 0) return "-";
  if (filtered.length <= 3) return filtered.join(", ");
  return `${filtered.slice(0, 3).join(", ")} 외 ${filtered.length - 3}명`;
}

function memberNamesToList(
  ids: string[],
  names: string[],
  memberLeaves: Record<string, string>,
) {
  const members = names
    .map((name, index) => ({ id: ids[index], name }))
    .filter((member) => member.name);
  if (members.length === 0) return "-";

  const visibleMembers = members.slice(0, 3);

  return (
    <>
      {visibleMembers.map((member, index) => (
        <span key={member.id || `${member.name}-${index}`}>
          {index > 0 && ", "}
          {member.name}
          {member.id && memberLeaves[member.id] && (
            <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
              오늘 {memberLeaves[member.id]}
            </span>
          )}
        </span>
      ))}
      {members.length > 3 && ` 외 ${members.length - 3}명`}
    </>
  );
}

function DescriptionCard({ description }: { description: string | null }) {
  return (
    <section className={`${cardClass} px-5 py-5`}>
      <h2 className="mb-3 text-sm font-semibold text-[#111111]">설명</h2>
      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
        {description ? (
          description
        ) : (
          <span className="text-slate-400">프로젝트 설명이 없습니다.</span>
        )}
      </div>
    </section>
  );
}

function ChecklistPanel({
  projectId,
  items,
}: {
  projectId: string;
  items: ProjectChecklistItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = items.length;
  const done = items.filter((item) => item.is_done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/checklist`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), sortOrder: items.length }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "체크리스트 추가에 실패했습니다.");
      }
      setTitle("");
      router.refresh();
    } catch (itemError) {
      toast.error(
        itemError instanceof Error
          ? itemError.message
          : "체크리스트 추가에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleItem(item: ProjectChecklistItem) {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/checklist/${item.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isDone: !item.is_done }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "체크리스트 변경에 실패했습니다.");
      }
      router.refresh();
    } catch (toggleError) {
      toast.error(
        toggleError instanceof Error
          ? toggleError.message
          : "체크리스트 변경에 실패했습니다.",
      );
    }
  }

  async function updateTitle(item: ProjectChecklistItem, nextTitle: string) {
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === item.title) return false;
    try {
      const response = await fetch(
        `/api/projects/${projectId}/checklist/${item.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "체크리스트 수정에 실패했습니다.");
      }
      toast.success("체크리스트를 수정했습니다.");
      router.refresh();
      return true;
    } catch (editError) {
      toast.error(
        editError instanceof Error
          ? editError.message
          : "체크리스트 수정에 실패했습니다.",
      );
      return false;
    }
  }

  async function deleteItem(item: ProjectChecklistItem) {
    if (!window.confirm("이 체크리스트 항목을 삭제하시겠습니까?")) return;
    try {
      const response = await fetch(
        `/api/projects/${projectId}/checklist/${item.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "체크리스트 삭제에 실패했습니다.");
      }
      toast.success("체크리스트를 삭제했습니다.");
      router.refresh();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "체크리스트 삭제에 실패했습니다.",
      );
    }
  }

  return (
    <section className={`${cardClass} px-5 py-5`}>
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#111111]">체크리스트</h2>
        {total > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="tabular-nums">
              {done}/{total}
            </span>
            <div className="h-1 w-20 overflow-hidden rounded-full bg-[#f3f3f3]">
              <div
                className="h-full rounded-full bg-[#111111] transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <ul className="mt-4 space-y-1">
        {items.length === 0 ? (
          <li className="rounded-lg bg-[#fafafa] px-4 py-8 text-center">
            <p className="text-sm text-slate-500">아직 체크리스트가 없습니다.</p>
            <p className="mt-1 text-xs text-slate-400">
              아래에서 첫 항목을 추가해보세요.
            </p>
          </li>
        ) : (
          items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              onToggle={() => toggleItem(item)}
              onSaveTitle={(nextTitle) => updateTitle(item, nextTitle)}
              onDelete={() => deleteItem(item)}
            />
          ))
        )}
      </ul>

      <form className="mt-4 flex gap-2" onSubmit={addItem}>
        <input
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="체크리스트 추가"
        />
        <button
          className={primaryBtnClass}
          disabled={submitting || !title.trim()}
          type="submit"
        >
          <Plus size={15} strokeWidth={1.5} />
          추가
        </button>
      </form>
    </section>
  );
}

function ChecklistItemRow({
  item,
  onToggle,
  onSaveTitle,
  onDelete,
}: {
  item: ProjectChecklistItem;
  onToggle: () => void;
  onSaveTitle: (nextTitle: string) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(item.title);
  }, [item.title]);

  const isEdited =
    item.updated_at && item.updated_at !== item.created_at;

  async function saveDraft() {
    setSaving(true);
    const ok = await onSaveTitle(draft);
    setSaving(false);
    if (ok || draft.trim() === item.title) {
      setEditing(false);
    }
  }

  function cancelEdit() {
    setDraft(item.title);
    setEditing(false);
  }

  return (
    <li className="group rounded-lg px-2 py-2 transition-colors hover:bg-[#fafafa]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={item.is_done ? "완료 취소" : "완료 표시"}
          onClick={onToggle}
          disabled={editing}
          className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
            item.is_done
              ? "border-[#111111] bg-[#111111] text-white"
              : "border-[#d1d5db] text-transparent hover:border-slate-400"
          } disabled:opacity-50`}
        >
          <Check size={13} strokeWidth={3} />
        </button>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void saveDraft();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
            }}
            disabled={saving}
            className="min-w-0 flex-1 rounded-md border border-[#e5e7eb] bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-[#111111] disabled:opacity-50"
          />
        ) : (
          <span
            className={`min-w-0 flex-1 text-sm ${
              item.is_done ? "text-slate-400 line-through" : "text-slate-700"
            }`}
          >
            {item.title}
          </span>
        )}
        {item.due_date && !editing && (
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            {formatShortDate(item.due_date)}
          </span>
        )}
        {editing ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="저장"
              onClick={() => void saveDraft()}
              disabled={saving || !draft.trim() || draft.trim() === item.title}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-[#f3f3f3] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="취소"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-[#f3f3f3] hover:text-[#111111]"
            >
              <X size={14} strokeWidth={1.6} />
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              aria-label="수정"
              onClick={() => setEditing(true)}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-[#f3f3f3] hover:text-[#111111]"
            >
              <Pencil size={14} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label="삭제"
              onClick={onDelete}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 ml-8 flex flex-wrap gap-x-2 text-[11px] text-slate-400">
        <span>등록 {formatDate(item.created_at)}</span>
        {isEdited && (
          <span>· 수정 {formatRelative(item.updated_at)}</span>
        )}
      </p>
    </li>
  );
}

function AttachmentsPanel({
  projectId,
  attachments,
  canEdit,
}: {
  projectId: string;
  attachments: ProjectAttachment[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function uploadFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`/api/projects/${projectId}/attachments`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload.error || `${file.name} 업로드에 실패했습니다.`,
          );
        }
      }
      toast.success("첨부파일을 업로드했습니다.");
      router.refresh();
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "첨부파일 업로드에 실패했습니다.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function deleteFile(attachment: ProjectAttachment) {
    if (!window.confirm(`'${attachment.file_name}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingId(attachment.id);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/attachments/${attachment.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "첨부파일 삭제에 실패했습니다.");
      }
      toast.success("첨부파일을 삭제했습니다.");
      router.refresh();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "첨부파일 삭제에 실패했습니다.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className={`${cardClass} px-5 py-5`}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip size={15} strokeWidth={1.5} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-[#111111]">첨부파일</h2>
          {attachments.length > 0 && (
            <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs font-medium text-slate-600">
              {attachments.length}
            </span>
          )}
        </div>
        {canEdit && (
          <>
            <input
              ref={inputRef}
              className="sr-only"
              multiple
              type="file"
              onChange={uploadFiles}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={ghostBtnClass}
            >
              <Upload size={14} strokeWidth={1.5} />
              {uploading ? "업로드 중..." : "업로드"}
            </button>
          </>
        )}
      </header>

      <div className="mt-4">
        {attachments.length === 0 ? (
          <div className="rounded-lg bg-[#fafafa] px-4 py-8 text-center">
            <p className="text-sm text-slate-500">첨부파일이 없습니다.</p>
            {canEdit && (
              <p className="mt-1 text-xs text-slate-400">
                상단 &lsquo;업로드&rsquo; 버튼으로 파일을 추가하세요.
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {attachments.map((item) => (
              <li
                key={item.id}
                className="group flex items-center gap-3 rounded-lg border border-[#f3f3f3] px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-[#fafafa]"
              >
                <Paperclip
                  size={14}
                  strokeWidth={1.5}
                  className="shrink-0 text-slate-400"
                />
                <a
                  href={`/api/projects/${projectId}/attachments/${item.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium text-slate-700">
                    {item.file_name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {formatFileSize(item.size_bytes)} · {item.uploaded_by_name} ·{" "}
                    {formatRelative(item.created_at)}
                  </p>
                </a>
                <a
                  href={`/api/projects/${projectId}/attachments/${item.id}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="다운로드"
                  className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-[#f3f3f3] hover:text-[#111111]"
                >
                  <Download size={14} strokeWidth={1.5} />
                </a>
                {canEdit && (
                  <button
                    type="button"
                    aria-label="삭제"
                    disabled={deletingId === item.id}
                    onClick={() => deleteFile(item)}
                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function LinkedRequestsPanel({
  projectId,
  requests,
}: {
  projectId: string;
  requests: LinkedRequestSummary[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  async function unlink(requestId: string) {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/requests/${requestId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "연결 해제에 실패했습니다.");
      }
      toast.success("요청 연결을 해제했습니다.");
      router.refresh();
    } catch (unlinkError) {
      toast.error(
        unlinkError instanceof Error
          ? unlinkError.message
          : "연결 해제에 실패했습니다.",
      );
    }
  }

  return (
    <section className={`${cardClass} px-5 py-5`}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#111111]">연결 요청</h2>
          <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs font-medium text-slate-600">
            {requests.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={ghostBtnClass}
        >
          <LinkIcon size={14} strokeWidth={1.5} />
          요청 연결
        </button>
      </header>

      <div className="mt-4">
        {requests.length === 0 ? (
          <div className="rounded-lg bg-[#fafafa] px-4 py-8 text-center">
            <p className="text-sm text-slate-500">연결된 요청이 없습니다.</p>
            <p className="mt-1 text-xs text-slate-400">
              상단 &lsquo;요청 연결&rsquo; 버튼으로 추가할 수 있습니다.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {requests.map((request) => (
              <li
                key={request.id}
                className="group flex items-start gap-2 rounded-lg border border-[#f3f3f3] p-3 transition-colors hover:border-slate-200 hover:bg-[#fafafa]"
              >
                <Link
                  className="min-w-0 flex-1 space-y-1.5"
                  href={`/requests/${request.id}`}
                >
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={request.status} />
                    <PriorityBadge priority={request.priority} />
                  </div>
                  <p className="truncate text-sm font-medium text-[#111111]">
                    {request.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    요청자 {request.requester_name}
                    {request.due_date && (
                      <>
                        {" · "}
                        마감 {request.due_date}
                      </>
                    )}
                  </p>
                </Link>
                <button
                  type="button"
                  aria-label="연결 해제"
                  onClick={() => unlink(request.id)}
                  className="shrink-0 rounded-md p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
                >
                  <X size={15} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <LinkRequestModal
          projectId={projectId}
          existingIds={requests.map((item) => item.id)}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}

function LinkRequestModal({
  projectId,
  existingIds,
  onClose,
}: {
  projectId: string;
  existingIds: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [allRequests, setAllRequests] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/requests?view=all")
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) {
          setAllRequests(Array.isArray(payload) ? payload : []);
        }
      })
      .catch(() => {
        if (!cancelled) setAllRequests([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const linkedSet = useMemo(() => new Set(existingIds), [existingIds]);
  const filtered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return allRequests
      .filter((request) => !linkedSet.has(request.id))
      .filter((request) => {
        if (!normalized) return true;
        return [request.title, request.requester_name, request.assignee_name]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalized));
      });
  }, [allRequests, keyword, linkedSet]);

  async function link(requestId: string) {
    setLinking(requestId);
    try {
      const response = await fetch(`/api/projects/${projectId}/requests`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "요청 연결에 실패했습니다.");
      }
      toast.success("요청을 연결했습니다.");
      onClose();
      router.refresh();
    } catch (linkError) {
      toast.error(
        linkError instanceof Error
          ? linkError.message
          : "요청 연결에 실패했습니다.",
      );
    } finally {
      setLinking(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-[#f3f3f3] px-5 py-4">
          <h2 className="text-base font-semibold text-[#111111]">요청 연결</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-[#f5f5f5] hover:text-slate-700"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </header>

        <div className="px-5 pt-4">
          <div className="relative">
            <Search
              size={14} strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              className="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-[#111111]"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="요청 제목, 요청자, 담당자 검색"
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">불러오는 중…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {keyword ? "검색 결과가 없습니다." : "연결 가능한 요청이 없습니다."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((request) => (
                <li
                  key={request.id}
                  className="flex items-start gap-2 rounded-lg border border-[#f3f3f3] p-3 transition-colors hover:border-slate-200 hover:bg-[#fafafa]"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={request.status} />
                      <PriorityBadge priority={request.priority} />
                    </div>
                    <p className="truncate text-sm font-medium text-[#111111]">
                      {request.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      요청자 {request.requester_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => link(request.id)}
                    disabled={linking !== null}
                    className={primaryBtnClass}
                  >
                    {linking === request.id ? "연결 중…" : "연결"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex justify-end border-t border-[#f3f3f3] px-5 py-3">
          <button type="button" onClick={onClose} className={ghostBtnClass}>
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}

function computeDDay(
  dueDate: string | null,
): { label: string; tone: "neutral" | "warn" | "danger" } | null {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff > 0) {
    return { label: `D-${diff}`, tone: diff <= 7 ? "warn" : "neutral" };
  }
  if (diff === 0) return { label: "D-Day", tone: "danger" };
  return { label: `D+${Math.abs(diff)}`, tone: "danger" };
}

function dDayToneClass(tone: "neutral" | "warn" | "danger") {
  if (tone === "danger") return "bg-rose-50 text-rose-700";
  if (tone === "warn") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatShortDate(value: string) {
  return value.replace(/^\d{4}-/, "");
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(value: string) {
  const now = Date.now();
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return formatDate(value);
  const diff = Math.round((now - target) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86_400 * 7) return `${Math.floor(diff / 86_400)}일 전`;
  return formatDate(value);
}
