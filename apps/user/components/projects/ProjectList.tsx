"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, KanbanSquare, Search, Users } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { OverviewFlow } from "@/components/overview/OverviewFlow";
import type { OverviewProject } from "@/lib/overview";
import type { ProjectStatus, ProjectSummary } from "@/lib/projects";
import { ProjectStatusBadge } from "@/components/projects/ProjectBadge";

type ViewMode = "list" | "board" | "timeline" | "graph";
const PROJECT_STATUSES: ProjectStatus[] = ["계획", "진행", "대기", "완료"];

export function ProjectList({
  projects,
  overviewProjects,
}: {
  projects: ProjectSummary[];
  overviewProjects: OverviewProject[];
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [projectsState, setProjectsState] = useState(projects);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    setProjectsState(projects);
  }, [projects]);

  async function handleStatusChange(
    projectId: string,
    nextStatus: ProjectStatus,
  ) {
    const previous = projectsState;
    const target = previous.find((project) => project.id === projectId);
    if (!target || target.status === nextStatus) return;

    setProjectsState((current) =>
      current.map((project) =>
        project.id === projectId ? { ...project, status: nextStatus } : project,
      ),
    );
    setPendingId(projectId);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "상태 변경에 실패했습니다.");
      }
      toast.success(`'${target.title}' 상태를 ${nextStatus}(으)로 변경했습니다.`);
      router.refresh();
    } catch (error) {
      setProjectsState(previous);
      toast.error(
        error instanceof Error ? error.message : "상태 변경에 실패했습니다.",
      );
    } finally {
      setPendingId(null);
    }
  }

  const filteredProjects = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return projectsState.filter((project) => {
      const statusMatches = statusFilter === "all" || project.status === statusFilter;
      if (!statusMatches) return false;
      if (!normalized) return true;
      return [
        project.title,
        project.description,
        project.created_by_name,
        project.owner_name,
        ...project.manager_names,
        ...project.stakeholder_names,
        ...project.stakeholder_team_names,
        ...project.customer_names,
        ...project.affiliate_names,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [keyword, projectsState, statusFilter]);
  const filteredOverviewProjects = useMemo(() => {
    const projectIds = new Set(filteredProjects.map((project) => project.id));
    return overviewProjects.filter((project) => projectIds.has(project.id));
  }, [filteredProjects, overviewProjects]);

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-[#f3f3f3] bg-white px-6 py-10 text-center">
        <p className="text-sm text-slate-500">아직 등록된 프로젝트가 없습니다.</p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-[#111111]"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="프로젝트, 고객사, 담당자 검색"
            />
          </div>
          <select
            className="h-9 shrink-0 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-slate-600 outline-none transition-colors focus:border-[#111111]"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as ProjectStatus | "all")
            }
          >
            <option value="all">전체 상태</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div
          role="tablist"
          aria-label="보기 전환"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-[#f3f3f3] bg-[#fafafa] p-0.5"
        >
          <ViewButton active={view === "list"} onClick={() => setView("list")}>
            목록
          </ViewButton>
          <ViewButton active={view === "board"} onClick={() => setView("board")}>
            보드
          </ViewButton>
          <ViewButton
            active={view === "timeline"}
            onClick={() => setView("timeline")}
          >
            타임라인
          </ViewButton>
          <ViewButton active={view === "graph"} onClick={() => setView("graph")}>
            그래프
          </ViewButton>
        </div>
      </div>

      {view === "list" && <ProjectTable projects={filteredProjects} />}
      {view === "board" && (
        <ProjectBoard
          projects={filteredProjects}
          onStatusChange={handleStatusChange}
          pendingId={pendingId}
        />
      )}
      {view === "timeline" && <ProjectTimeline projects={filteredProjects} />}
      {view === "graph" && <OverviewFlow projects={filteredOverviewProjects} />}
    </section>
  );
}

function ViewButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={onClick}
      className={`h-8 rounded-md px-3.5 text-xs font-medium transition-all ${
        active
          ? "bg-white text-[#111111] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]"
          : "text-slate-500 hover:text-[#111111]"
      }`}
    >
      {children}
    </button>
  );
}

function ProjectTable({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#f3f3f3] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] table-fixed text-left">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[68px]" />
            <col className="w-[112px]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[88px]" />
            <col className="w-[104px]" />
            <col className="w-[104px]" />
            <col className="w-[104px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead className="border-b border-[#f3f3f3] bg-[#fafafa]">
            <tr className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              <th className="px-4 py-2.5">프로젝트</th>
              <th className="px-4 py-2.5">고객사</th>
              <th className="px-4 py-2.5">계열사</th>
              <th className="px-4 py-2.5">상태</th>
              <th className="px-4 py-2.5">담당</th>
              <th className="px-4 py-2.5">관련자</th>
              <th className="px-4 py-2.5">관련팀</th>
              <th className="px-4 py-2.5">작성자</th>
              <th className="px-4 py-2.5">마감일</th>
              <th className="px-4 py-2.5">등록일</th>
              <th className="px-4 py-2.5">수정일</th>
              <th className="px-4 py-2.5">연결</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f3f3]">
            {projects.map((project) => (
              <tr key={project.id} className="transition-colors hover:bg-[#fafafa]">
                <td className="px-4 py-3 align-middle">
                  <Link className="block min-w-0" href={`/projects/${project.id}`}>
                    <p className="truncate text-sm font-medium text-[#111111]">
                      {project.title}
                    </p>
                  </Link>
                </td>
                <td className="px-4 py-3 align-middle">
                  <p className="truncate text-xs text-slate-500">
                    {displayNames(project.customer_names) || "-"}
                  </p>
                </td>
                <td className="px-4 py-3 align-middle">
                  <p className="truncate text-xs text-slate-500">
                    {displayNames(project.affiliate_names) || "-"}
                  </p>
                </td>
                <td className="px-4 py-3 align-middle">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                    <Users size={13} strokeWidth={1.5} className="shrink-0 text-slate-300" />
                    <span className="truncate">
                      {displayNames(project.manager_names) || "미지정"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <p className="truncate text-xs text-slate-500">
                    {displayNames(project.stakeholder_names) || "-"}
                  </p>
                </td>
                <td className="px-4 py-3 align-middle">
                  <p className="truncate text-xs text-slate-500">
                    {displayNames(project.stakeholder_team_names) || "-"}
                  </p>
                </td>
                <td className="px-4 py-3 align-middle">
                  <p className="truncate text-xs text-slate-600">
                    {project.created_by_name || "-"}
                  </p>
                </td>
                <td className="px-4 py-3 align-middle text-xs text-slate-600 tabular-nums">
                  {project.due_date ?? <span className="text-slate-300">-</span>}
                </td>
                <td className="px-4 py-3 align-middle text-xs text-slate-600 tabular-nums">
                  {formatDate(project.created_at)}
                </td>
                <td className="px-4 py-3 align-middle text-xs text-slate-600 tabular-nums">
                  {project.updated_at ? (
                    formatDate(project.updated_at)
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
                    <span className="rounded-md bg-[#f9f9fa] px-2 py-1">
                      요청 {project.linked_request_count ?? 0}
                    </span>
                    <span className="rounded-md bg-[#f9f9fa] px-2 py-1">
                      할일 {project.open_checklist_count ?? 0}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectBoard({
  projects,
  onStatusChange,
  pendingId,
}: {
  projects: ProjectSummary[];
  onStatusChange: (projectId: string, nextStatus: ProjectStatus) => void;
  pendingId: string | null;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(
    null,
  );

  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {PROJECT_STATUSES.map((status) => {
        const statusProjects = projects.filter(
          (project) => project.status === status,
        );
        const isDropTarget = dragOverStatus === status;
        const draggingProject = draggingId
          ? projects.find((project) => project.id === draggingId)
          : null;
        const canAcceptDrop =
          Boolean(draggingProject) && draggingProject?.status !== status;

        return (
          <section
            key={status}
            onDragOver={(event) => {
              if (!canAcceptDrop) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (dragOverStatus !== status) setDragOverStatus(status);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) {
                return;
              }
              if (dragOverStatus === status) setDragOverStatus(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              setDragOverStatus(null);
              setDraggingId(null);
              if (id) onStatusChange(id, status);
            }}
            className={`min-h-48 rounded-xl border bg-white transition-colors ${
              isDropTarget && canAcceptDrop
                ? "border-[#111111] bg-[#fafafa]"
                : "border-[#f3f3f3]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#f3f3f3] px-3 py-3">
              <ProjectStatusBadge status={status} />
              <span className="text-xs text-slate-400">
                {statusProjects.length}
              </span>
            </div>
            <div className="space-y-2 p-2">
              {statusProjects.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-slate-400">
                  {isDropTarget && canAcceptDrop ? "여기에 놓기" : "비어있음"}
                </p>
              ) : (
                statusProjects.map((project) => {
                  const isPending = pendingId === project.id;
                  const isDragging = draggingId === project.id;
                  return (
                    <Link
                      key={project.id}
                      draggable={!isPending}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", project.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(project.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverStatus(null);
                      }}
                      className={`block rounded-lg border border-[#f3f3f3] px-3 py-3 transition-colors hover:border-slate-300 hover:bg-[#fafafa] ${
                        isDragging ? "opacity-50" : ""
                      } ${isPending ? "pointer-events-none opacity-60" : ""}`}
                      href={`/projects/${project.id}`}
                    >
                      <p className="line-clamp-2 text-sm font-medium text-[#111111]">
                        {project.title}
                      </p>
                      <p className="mt-2 truncate text-xs text-slate-500">
                        {displayNames(project.customer_names) || "고객사 미지정"}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
                        <span>{project.due_date ?? "마감 미정"}</span>
                        <KanbanSquare size={14} strokeWidth={1.5} />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ProjectTimeline({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) return <EmptyState />;

  const datedProjects = projects
    .filter((project) => project.start_date || project.due_date)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  if (datedProjects.length === 0) {
    return (
      <div className="rounded-xl border border-[#f3f3f3] bg-white px-6 py-10 text-center">
        <CalendarDays className="mx-auto text-slate-300" size={24} strokeWidth={1.5} />
        <p className="mt-2 text-sm text-slate-500">
          일정이 있는 프로젝트가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#f3f3f3] bg-white p-4">
      <div className="space-y-3">
        {datedProjects.map((project) => (
          <Link
            key={project.id}
            className="grid gap-2 rounded-lg px-3 py-3 transition-colors hover:bg-[#fafafa] md:grid-cols-[220px_1fr_110px]"
            href={`/projects/${project.id}`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#111111]">
                {project.title}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {displayNames(project.customer_names)}
              </p>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-full rounded-full bg-[#f3f3f3]">
                <div className="h-2 w-full max-w-[85%] rounded-full bg-slate-700" />
              </div>
            </div>
            <div className="text-xs text-slate-500 md:text-right">
              {project.start_date ?? "시작 미정"} - {project.due_date ?? "마감 미정"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-[#f3f3f3] bg-white px-6 py-10 text-center">
      <p className="text-sm text-slate-500">조건에 맞는 프로젝트가 없습니다.</p>
    </div>
  );
}

function displayNames(names: string[]) {
  return names.filter(Boolean).join(", ");
}

function formatDate(value: string) {
  return value.slice(0, 10);
}
