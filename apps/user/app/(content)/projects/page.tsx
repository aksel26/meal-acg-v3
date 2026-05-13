import { ProjectList } from "@/components/projects/ProjectList";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { requireAuth } from "@/lib/auth";
import { getOverviewProjects } from "@/lib/overview";
import { listProjectsForUser } from "@/lib/projects";

export default async function ProjectsPage() {
  const user = await requireAuth();
  const [projects, overviewProjects] = await Promise.all([
    listProjectsForUser(user),
    getOverviewProjects(user),
  ]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">프로젝트</h1>
          <p className="mt-1 text-sm text-slate-500">
            전체 프로젝트 {projects.length.toLocaleString("ko-KR")}건
          </p>
        </div>
        <CreateProjectDialog />
      </div>
      <ProjectList projects={projects} overviewProjects={overviewProjects} />
    </div>
  );
}
