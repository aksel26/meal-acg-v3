import type { SessionUser } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
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

export type ProjectAttachment = {
  id: string;
  project_id: string;
  file_name: string;
  storage_path: string;
  content_type: string | null;
  size_bytes: number;
  uploaded_by: string;
  uploaded_by_name: string;
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

export type ProjectFeedItem = {
  id: string;
  project_id: string;
  content: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  attachments: ProjectFeedAttachment[];
};

export type ProjectFeedAttachment = {
  id: string;
  project_id: string;
  feed_item_id: string;
  file_name: string;
  storage_path: string;
  content_type: string | null;
  size_bytes: number;
  uploaded_by: string;
  uploaded_by_name: string;
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
  attachments: ProjectAttachment[];
  feedItems: ProjectFeedItem[];
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

export function canDeleteProject(user: SessionUser, project: ProjectRecord) {
  return user.role === "admin" || project.created_by === user.id;
}

export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  const supabase = createWorkClient();
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
  const supabase = createWorkClient();
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

  const requestCounts = countByProject((requestLinks ?? []) as { project_id: string }[]);
  const openChecklistCounts = countByProject(
    ((checklistItems ?? []) as { project_id: string; is_done: boolean }[]).filter(
      (item) => !item.is_done,
    ),
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

  const supabase = createWorkClient();
  const [
    { data: linkedRows, error: linkedError },
    { data: checklistItems, error: checklistError },
    attachmentRows,
    feedRows,
  ] = await Promise.all([
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
    supabase
      .from("project_attachments")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .then(async ({ data, error }) => {
        if (error) {
          if (error.code === "PGRST205" || error.code === "42P01") {
            console.warn(
              "project_attachments 테이블이 없어 첨부파일을 빈 값으로 처리합니다. 마이그레이션 적용이 필요합니다.",
            );
            return [] as ProjectAttachment[];
          }
          throw error;
        }
        return (data ?? []) as ProjectAttachment[];
      }),
    supabase
      .from("project_feed_items")
      .select("*")
      .eq("project_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(async ({ data, error }) => {
        if (error) {
          if (error.code === "PGRST205" || error.code === "42P01") {
            console.warn(
              "project_feed_items 테이블이 없어 프로젝트 피드를 빈 값으로 처리합니다. 마이그레이션 적용이 필요합니다.",
            );
            return [] as ProjectFeedItem[];
          }
          throw error;
        }
        const feedItems = (data ?? []) as Omit<ProjectFeedItem, "attachments">[];
        if (feedItems.length === 0) return [];

        const feedIds = feedItems.map((item) => item.id);
        const { data: attachments, error: attachmentError } = await supabase
          .from("project_feed_attachments")
          .select("*")
          .in("feed_item_id", feedIds)
          .order("created_at", { ascending: true });

        if (attachmentError) {
          if (attachmentError.code === "PGRST205" || attachmentError.code === "42P01") {
            console.warn(
              "project_feed_attachments 테이블이 없어 프로젝트 피드 첨부파일을 빈 값으로 처리합니다. 마이그레이션 적용이 필요합니다.",
            );
            return feedItems.map((item) => ({ ...item, attachments: [] }));
          }
          throw attachmentError;
        }

        const attachmentsByFeedId = new Map<string, ProjectFeedAttachment[]>();
        for (const attachment of (attachments ?? []) as ProjectFeedAttachment[]) {
          const current = attachmentsByFeedId.get(attachment.feed_item_id) ?? [];
          current.push(attachment);
          attachmentsByFeedId.set(attachment.feed_item_id, current);
        }

        return feedItems.map((item) => ({
          ...item,
          attachments: attachmentsByFeedId.get(item.id) ?? [],
        }));
      }),
  ]);

  if (linkedError) throw linkedError;
  if (checklistError) throw checklistError;

  const requestIds = ((linkedRows ?? []) as { request_id: string }[]).map(
    (row) => row.request_id,
  );
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
    attachments: attachmentRows,
    feedItems: feedRows,
  };
}

function countByProject(rows: { project_id: string }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  }
  return counts;
}
