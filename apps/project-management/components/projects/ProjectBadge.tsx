import type { ProjectStatus } from "@/lib/projects";

const statusClass: Record<ProjectStatus, string> = {
  계획: "bg-slate-100 text-slate-700",
  진행: "bg-blue-50 text-blue-700",
  대기: "bg-amber-50 text-amber-700",
  완료: "bg-emerald-50 text-emerald-700",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ${statusClass[status]}`}
    >
      {status}
    </span>
  );
}
