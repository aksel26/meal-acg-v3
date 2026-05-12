import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";
import { requireAuth } from "@/lib/auth";
import {
  canDeleteProject,
  canUpdateProject,
  getProjectDetailForUser,
} from "@/lib/projects";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const detail = await getProjectDetailForUser(id, user);

  if (!detail) {
    notFound();
  }

  return (
    <ProjectDetailClient
      {...detail}
      canEdit={canUpdateProject(user, detail.project)}
      canDelete={canDeleteProject(user, detail.project)}
    />
  );
}
