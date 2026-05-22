import { createServiceClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/auth";

export type LockerStatus = "available" | "assigned" | "disabled";
export type LockerRequestType = "assign" | "move" | "release";
export type LockerRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface LockerSummary {
  id: string;
  code: string;
  location_zone: string;
  location_detail: string;
  floor: string | null;
  row_label: string | null;
  column_label: string | null;
  status: LockerStatus;
  assigned_member_name: string | null;
  is_assigned_to_me: boolean;
}

export interface MyLockerState {
  lockers: LockerSummary[];
  myAssignment: LockerSummary | null;
  myPendingRequest: LockerRequestSummary | null;
  myRequests: LockerRequestSummary[];
}

export interface LockerRequestSummary {
  id: string;
  request_type: LockerRequestType;
  preferred_locker_id: string | null;
  current_locker_id: string | null;
  status: LockerRequestStatus;
  reason: string;
  reject_reason: string | null;
  created_at: string;
  processed_at: string | null;
  preferred_locker: {
    id: string;
    code: string;
    location_detail: string;
  } | null;
  current_locker: {
    id: string;
    code: string;
    location_detail: string;
  } | null;
}

type LockerAssignmentRow = {
  member_id: string;
  released_at: string | null;
  member?: { full_name: string | null } | { full_name: string | null }[] | null;
};

type LockerRow = {
  id: string;
  code: string;
  location_zone: string;
  location_detail: string;
  floor: string | null;
  row_label: string | null;
  column_label: string | null;
  status: LockerStatus;
  assignment?: LockerAssignmentRow[] | null;
};

type LockerRequestRow = Omit<
  LockerRequestSummary,
  "preferred_locker" | "current_locker"
> & {
  preferred_locker?:
    | LockerRequestSummary["preferred_locker"]
    | LockerRequestSummary["preferred_locker"][]
    | null;
  current_locker?:
    | LockerRequestSummary["current_locker"]
    | LockerRequestSummary["current_locker"][]
    | null;
};

function getMemberName(member: LockerAssignmentRow["member"]) {
  if (!member) return null;
  if (Array.isArray(member)) return member[0]?.full_name ?? null;
  return member.full_name;
}

function getJoinedLocker(
  locker: LockerRequestRow["preferred_locker"],
): LockerRequestSummary["preferred_locker"] {
  if (!locker) return null;
  return Array.isArray(locker) ? (locker[0] ?? null) : locker;
}

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function assertLockerRequestPayload(body: unknown) {
  const record = body as Record<string, unknown>;
  const requestType = normalizeText(record.requestType);
  const preferredLockerId = normalizeText(record.preferredLockerId) || null;
  const reason = normalizeText(record.reason);

  if (requestType !== "assign" && requestType !== "move") {
    throw new Error("요청 유형을 확인해주세요.");
  }
  if (!reason) {
    throw new Error("요청 사유를 입력해주세요.");
  }

  return { requestType, preferredLockerId, reason };
}

export async function listLockersForUser(
  session: SessionUser,
): Promise<MyLockerState> {
  const supabase = createServiceClient();
  if (!supabase) throw new Error("데이터베이스 연결 오류");

  const client = supabase as any;
  const { data: lockers, error: lockerError } = await client
    .from("lockers")
    .select(
      `
      id,
      code,
      location_zone,
      location_detail,
      floor,
      row_label,
      column_label,
      status,
      assignment:locker_assignments!locker_assignments_locker_id_fkey(
        member_id,
        released_at,
        member:members!locker_assignments_member_id_fkey(full_name)
      )
    `,
    )
    .order("location_zone", { ascending: true })
    .order("code", { ascending: true });

  if (lockerError) throw new Error("사물함 목록을 불러오지 못했습니다.");

  const summaries = ((lockers ?? []) as LockerRow[]).map((locker) => {
    const activeAssignment =
      locker.assignment?.find((item) => item.released_at === null) ?? null;

    return {
      id: locker.id,
      code: locker.code,
      location_zone: locker.location_zone,
      location_detail: locker.location_detail,
      floor: locker.floor,
      row_label: locker.row_label,
      column_label: locker.column_label,
      status: locker.status,
      assigned_member_name: getMemberName(activeAssignment?.member ?? null),
      is_assigned_to_me: activeAssignment?.member_id === session.id,
    } satisfies LockerSummary;
  });

  const myAssignment =
    summaries.find((locker) => locker.is_assigned_to_me) ?? null;

  const { data: requests } = await client
    .from("locker_requests")
    .select(
      `
      id,
      request_type,
      preferred_locker_id,
      current_locker_id,
      status,
      reason,
      reject_reason,
      created_at,
      processed_at,
      preferred_locker:lockers!locker_requests_preferred_locker_id_fkey(
        id,
        code,
        location_detail
      ),
      current_locker:lockers!locker_requests_current_locker_id_fkey(
        id,
        code,
        location_detail
      )
    `,
    )
    .eq("requester_id", session.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const myRequests = ((requests ?? []) as LockerRequestRow[]).map(
    (request) => ({
      ...request,
      preferred_locker: getJoinedLocker(request.preferred_locker ?? null),
      current_locker: getJoinedLocker(request.current_locker ?? null),
    }),
  );

  return {
    lockers: summaries,
    myAssignment,
    myPendingRequest:
      myRequests.find((request) => request.status === "pending") ?? null,
    myRequests,
  };
}
