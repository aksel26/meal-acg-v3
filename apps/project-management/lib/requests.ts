// 서버 전용 모듈. next/headers 를 쓰는 supabase/server 를 참조하므로
// 클라이언트 컴포넌트에서 값을 import 하면 안 된다.
// 상수·타입만 필요하면 `lib/request-constants.ts` 를 쓸 것.
import { createServiceClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth";
import {
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  type RequestPriority,
  type RequestStatus,
} from "@/lib/request-constants";

export {
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  isRequestPriority,
  isRequestStatus,
} from "@/lib/request-constants";
export type {
  RequestPriority,
  RequestStatus,
} from "@/lib/request-constants";

export type RequestRecord = {
  id: string;
  title: string;
  body: string | null;
  priority: RequestPriority;
  status: RequestStatus;
  requester_id: string;
  requester_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_ids: string[];
  assignee_names: string[];
  team_name: string | null;
  team_names: string[];
  customer_names: string[];
  affiliate_names: string[];
  request_type: string | null;
  request_type_name: string | null;
  completion_note: string | null;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type RequestComment = {
  id: string;
  request_id: string;
  author_id: string;
  author_name: string;
  body: string;
  is_system: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type RequestAttachment = {
  id: string;
  request_id: string;
  comment_id: string | null;
  file_name: string;
  storage_path: string;
  content_type: string | null;
  size_bytes: number;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
};

export type RequestEvent = {
  id: string;
  request_id: string;
  actor_id: string;
  actor_name: string;
  event_type: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
};

export type CompletionMemo = {
  id: string;
  request_id: string;
  author_name: string;
  body: string;
  created_at: string;
  editable: boolean;
  source: "event" | "legacy";
  edited_at: string | null;
  edited_by_name: string | null;
};

export type LinkedProjectSummary = {
  id: string;
  title: string;
  status: "계획" | "진행" | "대기" | "완료";
  due_date: string | null;
  customer_names: string[];
};

export function canReadRequest(_user: SessionUser, _request: RequestRecord) {
  return true;
}

export function canUpdateRequest(user: SessionUser, request: RequestRecord) {
  return request.requester_id === user.id;
}

export const canDeleteRequest = canUpdateRequest;

export async function getRequestById(id: string): Promise<RequestRecord | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as RequestRecord;
}

export async function recordEvent({
  requestId,
  actor,
  eventType,
  before,
  after,
}: {
  requestId: string;
  actor: SessionUser;
  eventType: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("events").insert({
    request_id: requestId,
    actor_id: actor.id,
    actor_name: actor.fullName,
    event_type: eventType,
    before: before ?? null,
    after: after ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function listRequestsForUser(
  user: SessionUser,
  view?: "mine" | "queue" | "all",
): Promise<RequestRecord[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (view === "mine") {
    query = query.eq("requester_id", user.id);
  } else if (view === "queue") {
    query = query.or(`assignee_id.eq.${user.id},assignee_ids.cs.{${user.id}}`);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data as RequestRecord[];
}

export async function getRequestDetailForUser(id: string, user: SessionUser) {
  const request = await getRequestById(id);

  if (!request || !canReadRequest(user, request)) {
    return null;
  }

  const supabase = createServiceClient();
  const [{ data: comments, error: commentsError }, { data: attachments, error: attachmentsError }, { data: events, error: eventsError }, relatedRequests, linkedProjects] =
    await Promise.all([
      supabase
        .from("comments")
        .select("*")
        .eq("request_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("attachments")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("events")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: true }),
      getRelatedRequests(request, user),
      getLinkedProjectsForRequest(id, user),
    ]);

  if (commentsError) throw commentsError;
  if (attachmentsError) throw attachmentsError;
  if (eventsError) throw eventsError;

  return {
    request,
    comments: comments as RequestComment[],
    attachments: attachments as RequestAttachment[],
    events: events as RequestEvent[],
    relatedRequests,
    linkedProjects,
  };
}

async function getLinkedProjectsForRequest(
  requestId: string,
  user: SessionUser,
): Promise<LinkedProjectSummary[]> {
  const supabase = createServiceClient();
  const { data: links, error: linkError } = await supabase
    .from("project_requests")
    .select("project_id")
    .eq("request_id", requestId);

  if (linkError) throw linkError;
  const projectIds = (links ?? []).map((link) => link.project_id);
  if (projectIds.length === 0) return [];

  let query = supabase
    .from("projects")
    .select("id, title, status, due_date, customer_names, created_by, owner_id, manager_ids")
    .in("id", projectIds)
    .order("created_at", { ascending: false });

  if (user.role !== "admin" && user.role !== "team_lead") {
    query = query.or(
      `created_by.eq.${user.id},owner_id.eq.${user.id},manager_ids.cs.{${user.id}}`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((project) => ({
    id: project.id,
    title: project.title,
    status: project.status,
    due_date: project.due_date,
    customer_names: project.customer_names ?? [],
  })) as LinkedProjectSummary[];
}

export type RelatedRequestSummary = {
  id: string;
  title: string;
  status: RequestStatus;
  priority: RequestPriority;
  created_at: string;
  due_date: string | null;
  requester_name: string;
};

async function getRelatedRequests(
  current: RequestRecord,
  _user: SessionUser,
): Promise<RelatedRequestSummary[]> {
  const customerNames = (current.customer_names ?? [])
    .map((name) => name.trim())
    .filter(Boolean);

  if (customerNames.length === 0) {
    return [];
  }

  const supabase = createServiceClient();
  const query = supabase
    .from("requests")
    .select("id, title, status, priority, created_at, due_date, requester_name")
    .neq("id", current.id)
    .overlaps("customer_names", customerNames)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as RelatedRequestSummary[];
}
