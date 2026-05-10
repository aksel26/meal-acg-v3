import type { SessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { RequestPriority, RequestStatus } from "@/lib/requests";

export const PROJECT_STATUSES = ["계획", "진행", "대기", "완료"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type ProjectRecord = {
  id: string;
  title: string;
  description: string | null;
  customer_names: string[];
  affiliate_names: string[];
  owner_id: string | null;
  owner_name: string | null;
  manager_ids: string[];
  manager_names: string[];
  stakeholder_ids: string[];
  stakeholder_names: string[];
  stakeholder_team_ids: string[];
  stakeholder_team_names: string[];
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type ProjectRequestLink = {
  project_id: string;
  request_id: string;
  linked_by: string;
  linked_by_name: string;
  created_at: string;
};

export type ProjectChecklistItem = {
  id: string;
  project_id: string;
  title: string;
  is_done: boolean;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  sort_order: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type LinkedRequestSummary = {
  id: string;
  title: string;
  status: RequestStatus;
  priority: RequestPriority;
  requester_name: string;
  assignee_name: string | null;
  assignee_names: string[];
  due_date: string | null;
  created_at: string;
};

export type ProjectSummary = ProjectRecord & {
  linked_request_count?: number;
  open_checklist_count?: number;
};

export type ProjectDetail = {
  project: ProjectRecord;
  linkedRequests: LinkedRequestSummary[];
  checklistItems: ProjectChecklistItem[];
};

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && PROJECT_STATUSES.includes(value as ProjectStatus);
}

export function canManageProject(user: SessionUser, project: ProjectRecord) {
  return (
    user.role === "admin" ||
    user.role === "team_lead" ||
    project.created_by === user.id ||
    project.owner_id === user.id ||
    (project.manager_ids?.includes(user.id) ?? false) ||
    (project.stakeholder_ids?.includes(user.id) ?? false)
  );
}

export function canUpdateProject(user: SessionUser, project: ProjectRecord) {
  return canManageProject(user, project);
}

export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as ProjectRecord;
}

export async function listProjectsForUser(user: SessionUser): Promise<ProjectSummary[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (user.role !== "admin" && user.role !== "team_lead") {
    query = query.or(
      `created_by.eq.${user.id},owner_id.eq.${user.id},manager_ids.cs.{${user.id}},stakeholder_ids.cs.{${user.id}}`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const projects = (data ?? []) as ProjectRecord[];
  if (projects.length === 0) return [];

  const ids = projects.map((project) => project.id);
  const [{ data: requestLinks }, { data: checklistItems }] = await Promise.all([
    supabase.from("project_requests").select("project_id").in("project_id", ids),
    supabase
      .from("project_checklist_items")
      .select("project_id, is_done")
      .in("project_id", ids),
  ]);

  const requestCounts = countByProject(requestLinks ?? []);
  const openChecklistCounts = countByProject(
    (checklistItems ?? []).filter((item) => !item.is_done),
  );

  return projects.map((project) => ({
    ...project,
    linked_request_count: requestCounts.get(project.id) ?? 0,
    open_checklist_count: openChecklistCounts.get(project.id) ?? 0,
  }));
}

export async function getProjectDetailForUser(
  id: string,
  user: SessionUser,
): Promise<ProjectDetail | null> {
  const project = await getProjectById(id);
  if (!project || !canManageProject(user, project)) return null;

  const supabase = createServiceClient();
  const [{ data: linkedRows, error: linkedError }, { data: checklistItems, error: checklistError }] =
    await Promise.all([
      supabase
        .from("project_requests")
        .select("request_id")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_checklist_items")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (linkedError) throw linkedError;
  if (checklistError) throw checklistError;

  const requestIds = (linkedRows ?? []).map((row) => row.request_id);
  let linkedRequests: LinkedRequestSummary[] = [];

  if (requestIds.length > 0) {
    const { data, error } = await supabase
      .from("requests")
      .select(
        "id, title, status, priority, requester_name, assignee_name, assignee_names, due_date, created_at",
      )
      .in("id", requestIds)
      .order("created_at", { ascending: false });

    if (error) throw error;
    linkedRequests = (data ?? []) as LinkedRequestSummary[];
  }

  return {
    project,
    linkedRequests,
    checklistItems: (checklistItems ?? []) as ProjectChecklistItem[],
  };
}

function countByProject(rows: { project_id: string }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  }
  return counts;
}
