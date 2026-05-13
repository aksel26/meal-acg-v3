import type { SessionUser } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { listProjectsForUser, type ProjectSummary } from "@/lib/projects";
import type { RequestPriority, RequestStatus } from "@/lib/requests";

export type OverviewRequest = {
  id: string;
  title: string;
  status: RequestStatus;
  priority: RequestPriority;
  due_date: string | null;
  customer_names: string[];
};

export type OverviewProject = Pick<
  ProjectSummary,
  "id" | "title" | "status" | "customer_names" | "affiliate_names" | "due_date"
> & {
  requests: OverviewRequest[];
};

export async function getOverviewProjects(
  user: SessionUser,
): Promise<OverviewProject[]> {
  const projects = await listProjectsForUser(user);
  if (projects.length === 0) return [];

  const supabase = createWorkClient();
  const projectIds = projects.map((project) => project.id);
  const { data: links, error: linksError } = await supabase
    .from("project_requests")
    .select("project_id, request_id")
    .in("project_id", projectIds);

  if (linksError) throw linksError;

  const requestIds = Array.from(
    new Set(
      ((links ?? []) as { project_id: string; request_id: string }[]).map(
        (link) => link.request_id,
      ),
    ),
  );
  const requestsById = new Map<string, OverviewRequest>();

  if (requestIds.length > 0) {
    const { data: requests, error: requestsError } = await supabase
      .from("requests")
      .select("id, title, status, priority, due_date, customer_names")
      .in("id", requestIds);

    if (requestsError) throw requestsError;

    for (const request of (requests ?? []) as OverviewRequest[]) {
      requestsById.set(request.id, request);
    }
  }

  const requestIdsByProject = new Map<string, string[]>();
  for (const link of (links ?? []) as { project_id: string; request_id: string }[]) {
    const current = requestIdsByProject.get(link.project_id) ?? [];
    current.push(link.request_id);
    requestIdsByProject.set(link.project_id, current);
  }

  return projects.map((project) => ({
    id: project.id,
    title: project.title,
    status: project.status,
    customer_names: project.customer_names ?? [],
    affiliate_names: project.affiliate_names ?? [],
    due_date: project.due_date,
    requests: (requestIdsByProject.get(project.id) ?? [])
      .map((requestId) => requestsById.get(requestId))
      .filter((request): request is OverviewRequest => Boolean(request)),
  }));
}
