import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { ProjectList } from "@/components/projects/ProjectList";
import { requireAuth } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/projects";

export default async function ProjectsPage() {
  const user = await requireAuth();
  const projects = await listProjectsForUser(user);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">프로젝트</h1>
          <p className="mt-1 text-sm text-slate-500">
            고객사별 프로젝트와 연결 요청을 관리합니다.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <ProjectList projects={projects} />
    </div>
  );
}
