export type LockerStatus = "available" | "assigned" | "disabled";
export type LockerRequestType = "assign" | "move" | "release";
export type LockerRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface AdminLockerMember {
  id: string;
  full_name: string | null;
  team?: { name: string | null } | { name: string | null }[] | null;
}

export interface AdminLockerAssignment {
  id: string;
  member_id: string;
  released_at: string | null;
  member:
    | {
        id: string;
        full_name: string | null;
        team?: { name: string | null } | { name: string | null }[] | null;
      }
    | {
        id: string;
        full_name: string | null;
        team?: { name: string | null } | { name: string | null }[] | null;
      }[]
    | null;
}

export interface AdminLocker {
  id: string;
  code: string;
  location_zone: string;
  location_detail: string;
  floor: string | null;
  row_label: string | null;
  column_label: string | null;
  status: LockerStatus;
  memo: string | null;
  assignment?: AdminLockerAssignment[] | null;
}

export interface AdminLockerRequest {
  id: string;
  requester_id: string;
  request_type: LockerRequestType;
  preferred_locker_id: string | null;
  current_locker_id: string | null;
  reason: string;
  status: LockerRequestStatus;
  reject_reason: string | null;
  created_at: string;
  requester: {
    id: string;
    full_name: string | null;
    team?: { name: string | null } | { name: string | null }[] | null;
  } | null;
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

export interface LockerAdminOverview {
  lockers: AdminLocker[];
  requests: AdminLockerRequest[];
  members: AdminLockerMember[];
}

export function getTeamName(
  team: { name: string | null } | { name: string | null }[] | null | undefined,
) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0]?.name ?? null;
  return team.name;
}

export function getAssignmentMember(assignment: AdminLockerAssignment | null) {
  if (!assignment?.member) return null;
  if (Array.isArray(assignment.member)) return assignment.member[0] ?? null;
  return assignment.member;
}

export function getActiveAssignment(locker: AdminLocker) {
  return locker.assignment?.find((item) => item.released_at === null) ?? null;
}
