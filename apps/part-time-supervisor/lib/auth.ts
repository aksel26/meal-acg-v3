import { cookies, headers } from "next/headers";
import { decodeSessionCookie, encodeSessionCookie } from "./session-cookie";
import { createPublicServiceClient } from "./supabase/server";

export type SessionUser = {
  id: string;
  fullName: string;
  role: string;
  canEdit: boolean;
};

type AuthSession = {
  userId: string;
  fullName: string;
  role: string;
  canEdit: boolean;
};

const SESSION_COOKIE_NAME = "supervisor-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const OPERATIONS_TEAM_ID =
  process.env.SUPERVISOR_EDITOR_TEAM_ID ||
  "a1000000-0000-0000-0000-000000000001";
const PNC_TEAM_PATTERN = /p&c|people\s*&\s*culture/i;

type AccessMember = {
  role: string | null;
  team_id: string | null;
  teams?: { name: string | null } | { name: string | null }[] | null;
};

// 감독관 앱 접근/편집 권한은 관리자, 운영팀(HR 운영팀), P&C팀으로 제한한다.
// P&C팀은 고정 UUID가 없어 팀 이름으로 식별한다(admin 앱 규칙과 동일).
export function hasSupervisorAccess(member: AccessMember): boolean {
  if (member.role === "admin") return true;
  if (member.team_id === OPERATIONS_TEAM_ID) return true;
  const team = Array.isArray(member.teams) ? member.teams[0] : member.teams;
  return PNC_TEAM_PATTERN.test(team?.name ?? "");
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function setSession(session: AuthSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, await encodeSessionCookie(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  return decodeSessionCookie(sessionCookie.value);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser> {
  const headerStore = await headers();
  const id = headerStore.get("x-session-user-id");
  const rawName = headerStore.get("x-session-user-name");
  const fullName = rawName ? decodeURIComponent(rawName) : null;
  const role = headerStore.get("x-session-user-role");
  const canEdit = headerStore.get("x-session-user-can-edit") === "true";

  if (!id || !fullName || !role) {
    throw new AuthError("Unauthorized", 401);
  }

  return { id, fullName, role, canEdit };
}

export async function requireAuth(): Promise<SessionUser> {
  const forwarded = await getSessionUser();
  const supabase = createPublicServiceClient();
  const [{ data: member }, { data: status }] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, role, team_id, teams(name)")
      .eq("id", forwarded.id)
      .maybeSingle(),
    supabase
      .from("member_current_status")
      .select("current_status")
      .eq("member_id", forwarded.id)
      .maybeSingle(),
  ]);

  if (!member || status?.current_status === "퇴사") {
    throw new AuthError("Unauthorized", 401);
  }

  // 접근 자체가 운영팀/P&C팀/관리자로 제한되므로 권한이 없으면 전면 차단한다.
  const canEdit = hasSupervisorAccess(member);
  if (!canEdit) {
    throw new AuthError("Forbidden", 403);
  }

  return {
    id: member.id,
    fullName: member.full_name,
    role: member.role ?? "user",
    canEdit,
  };
}

export async function resolveFreshSession(
  session: Pick<AuthSession, "userId">,
): Promise<SessionUser | null> {
  const supabase = createPublicServiceClient();
  const [{ data: member }, { data: status }] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, role, team_id, teams(name)")
      .eq("id", session.userId)
      .maybeSingle(),
    supabase
      .from("member_current_status")
      .select("current_status")
      .eq("member_id", session.userId)
      .maybeSingle(),
  ]);
  if (!member || status?.current_status === "퇴사") return null;

  return {
    id: member.id,
    fullName: member.full_name,
    role: member.role ?? "user",
    canEdit: hasSupervisorAccess(member),
  };
}
