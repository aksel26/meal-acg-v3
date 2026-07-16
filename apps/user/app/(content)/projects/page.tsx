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
      <div className="flex justify-end">
        <CreateProjectDialog />
      </div>
      <ProjectList projects={projects} overviewProjects={overviewProjects} />
    </div>
  );
}
