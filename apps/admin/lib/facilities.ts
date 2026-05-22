import { createServiceClient } from "@/lib/supabase/server";
import type {
  AdminLocker,
  AdminLockerMember,
  AdminLockerRequest,
  LockerAdminOverview,
} from "@/lib/facilities-types";

type JoinedLocker = AdminLockerRequest["preferred_locker"];
type AdminLockerRequestRow = Omit<
  AdminLockerRequest,
  "requester" | "preferred_locker" | "current_locker"
> & {
  requester?:
    | AdminLockerRequest["requester"]
    | AdminLockerRequest["requester"][]
    | null;
  preferred_locker?: JoinedLocker | JoinedLocker[] | null;
  current_locker?: JoinedLocker | JoinedLocker[] | null;
};

function getJoinedItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listLockerAdminOverview(): Promise<LockerAdminOverview> {
  const supabase = createServiceClient() as any;
  const [
    { data: lockers, error: lockersError },
    { data: requests, error: requestsError },
    { data: members, error: membersError },
  ] = await Promise.all([
    supabase
      .from("lockers")
      .select(
        `
          *,
          assignment:locker_assignments!locker_assignments_locker_id_fkey(
            id,
            member_id,
            released_at,
            member:members!locker_assignments_member_id_fkey(
              id,
              full_name,
              team:teams!members_team_id_fkey(name)
            )
          )
        `,
      )
      .order("location_zone", { ascending: true })
      .order("code", { ascending: true }),
    supabase
      .from("locker_requests")
      .select(
        `
          *,
          requester:members!locker_requests_requester_id_fkey(
            id,
            full_name,
            team:teams!members_team_id_fkey(name)
          ),
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
      .order("created_at", { ascending: false }),
    supabase
      .from("members")
      .select(
        `
          id,
          full_name,
          team:teams!members_team_id_fkey(name)
        `,
      )
      .order("full_name", { ascending: true }),
  ]);

  if (lockersError) throw new Error("사물함 목록을 불러오지 못했습니다.");
  if (requestsError) throw new Error("사물함 요청 목록을 불러오지 못했습니다.");
  if (membersError) throw new Error("직원 목록을 불러오지 못했습니다.");

  return {
    lockers: (lockers ?? []) as AdminLocker[],
    requests: ((requests ?? []) as AdminLockerRequestRow[]).map((request) => ({
      ...request,
      requester: getJoinedItem(request.requester),
      preferred_locker: getJoinedItem(request.preferred_locker),
      current_locker: getJoinedItem(request.current_locker),
    })),
    members: (members ?? []) as AdminLockerMember[],
  };
}
