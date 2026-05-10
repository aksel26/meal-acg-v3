"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, KanbanSquare, ListFilter, Users } from "lucide-react";
import type { ProjectStatus, ProjectSummary } from "@/lib/projects";
import { ProjectStatusBadge } from "@/components/projects/ProjectBadge";

type ViewMode = "list" | "board" | "timeline";
const PROJECT_STATUSES: ProjectStatus[] = ["계획", "진행", "대기", "완료"];

export function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  const [view, setView] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [keyword, setKeyword] = useState("");

  const filteredProjects = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return projects.filter((project) => {
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
  }, [keyword, projects, statusFilter]);

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-[#f3f3f3] bg-white px-6 py-10 text-center">
        <p className="text-sm text-slate-500">아직 등록된 프로젝트가 없습니다.</p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 rounded-xl border border-[#f3f3f3] bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ListFilter size={16} className="shrink-0 text-slate-400" />
          <input
            className="h-9 min-w-0 flex-1 rounded-lg border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#111111]"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="프로젝트, 고객사, 담당자 검색"
          />
          <select
            className="h-9 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#111111]"
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
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#f9f9fa] p-1">
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
        </div>
      </div>

      {view === "list" && <ProjectTable projects={filteredProjects} />}
      {view === "board" && <ProjectBoard projects={filteredProjects} />}
      {view === "timeline" && <ProjectTimeline projects={filteredProjects} />}
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
      className={`h-8 rounded-md px-3 text-sm transition-colors ${
        active ? "bg-white font-medium text-[#111111] shadow-sm" : "text-slate-500"
      }`}
      type="button"
      onClick={onClick}
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
        <table className="w-full min-w-[1280px] table-fixed text-left">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[9%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="border-b border-[#f3f3f3] bg-[#fafafa]">
            <tr className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              <th className="px-4 py-2.5">프로젝트</th>
              <th className="px-4 py-2.5">상태</th>
              <th className="px-4 py-2.5">담당</th>
              <th className="px-4 py-2.5">관련자</th>
              <th className="px-4 py-2.5">관련팀</th>
              <th className="px-4 py-2.5">등록일</th>
              <th className="px-4 py-2.5">마감일</th>
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
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {displayNames(project.customer_names) || "고객사 미지정"}
                      {project.affiliate_names.length > 0
                        ? ` · ${displayNames(project.affiliate_names)}`
                        : ""}
                    </p>
                  </Link>
                </td>
                <td className="px-4 py-3 align-middle">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                    <Users size={13} className="shrink-0 text-slate-300" />
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
                <td className="px-4 py-3 align-middle text-xs text-slate-600 tabular-nums">
                  {formatDate(project.created_at)}
                </td>
                <td className="px-4 py-3 align-middle text-xs text-slate-600 tabular-nums">
                  {project.due_date ?? <span className="text-slate-300">-</span>}
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

function ProjectBoard({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {PROJECT_STATUSES.map((status) => {
        const statusProjects = projects.filter((project) => project.status === status);
        return (
          <section
            key={status}
            className="min-h-48 rounded-xl border border-[#f3f3f3] bg-white"
          >
            <div className="flex items-center justify-between border-b border-[#f3f3f3] px-3 py-3">
              <ProjectStatusBadge status={status} />
              <span className="text-xs text-slate-400">{statusProjects.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {statusProjects.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-slate-400">비어있음</p>
              ) : (
                statusProjects.map((project) => (
                  <Link
                    key={project.id}
                    className="block rounded-lg border border-[#f3f3f3] px-3 py-3 transition-colors hover:border-slate-300 hover:bg-[#fafafa]"
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
                      <KanbanSquare size={14} />
                    </div>
                  </Link>
                ))
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
        <CalendarDays className="mx-auto text-slate-300" size={24} />
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
