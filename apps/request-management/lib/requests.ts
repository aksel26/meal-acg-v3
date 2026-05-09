import { createServiceClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth";

export const REQUEST_STATUSES = ["접수", "진행", "대기", "완료", "거절"] as const;
export const REQUEST_PRIORITIES = ["P1", "P2", "P3"] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

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

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && REQUEST_STATUSES.includes(value as RequestStatus);
}

export function isRequestPriority(value: unknown): value is RequestPriority {
  return typeof value === "string" && REQUEST_PRIORITIES.includes(value as RequestPriority);
}

export function canManageRequest(user: SessionUser, request: RequestRecord) {
  return (
    user.role === "admin" ||
    user.role === "team_lead" ||
    request.requester_id === user.id ||
    request.assignee_id === user.id ||
    (request.assignee_ids?.includes(user.id) ?? false)
  );
}

export function canUpdateRequest(user: SessionUser, request: RequestRecord) {
  return (
    user.role === "admin" ||
    user.role === "team_lead" ||
    request.assignee_id === user.id ||
    (request.assignee_ids?.includes(user.id) ?? false) ||
    (request.requester_id === user.id && request.status === "접수")
  );
}

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
  } else if (user.role !== "admin" && user.role !== "team_lead") {
    query = query.or(
      `requester_id.eq.${user.id},assignee_id.eq.${user.id},assignee_ids.cs.{${user.id}}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data as RequestRecord[];
}

export async function getRequestDetailForUser(id: string, user: SessionUser) {
  const request = await getRequestById(id);

  if (!request || !canManageRequest(user, request)) {
    return null;
  }

  const supabase = createServiceClient();
  const [{ data: comments, error: commentsError }, { data: attachments, error: attachmentsError }, { data: events, error: eventsError }] =
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
    ]);

  if (commentsError) throw commentsError;
  if (attachmentsError) throw attachmentsError;
  if (eventsError) throw eventsError;

  return {
    request,
    comments: comments as RequestComment[],
    attachments: attachments as RequestAttachment[],
    events: events as RequestEvent[],
  };
}
