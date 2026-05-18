import { cookies } from "next/headers";
import type { AuthSession } from "./supabase/types";
import { createServiceClient } from "./supabase/server";
import {
  hasAdminPermission,
  isUserAuthority,
  normalizeAdminRole,
  type AdminPermission,
} from "./rbac";

const SESSION_COOKIE_NAME = "admin-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
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

  try {
    return JSON.parse(sessionCookie.value) as AuthSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Unauthorized", 401);
  }
  return session;
}

export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth();
  if (session.role !== "admin") {
    throw new AuthError("Forbidden: Admin access required", 403);
  }

  const supabase = createServiceClient();
  const { data: member, error } = await supabase
    .from("members")
    .select("id, full_name, role, admin_role, user_authority")
    .eq("id", session.userId)
    .single();

  if (error || !member) {
    throw new AuthError("Unauthorized", 401);
  }

  if (member.role !== "admin") {
    throw new AuthError("Forbidden: Admin access required", 403);
  }

  return {
    ...session,
    fullName: member.full_name,
    role: "admin",
    adminRole: normalizeAdminRole(member.admin_role),
    userAuthority: isUserAuthority(member.user_authority)
      ? member.user_authority
      : null,
  };
}

export async function requireAdminPermission(
  permission: AdminPermission,
): Promise<AuthSession> {
  const session = await requireAdmin();

  if (!hasAdminPermission(session.adminRole, permission)) {
    throw new AuthError("Forbidden: Permission denied", 403);
  }

  return session;
}

export function getAuthErrorStatus(error: unknown) {
  if (error instanceof AuthError) return error.status;
  if (error instanceof Error && error.message === "Unauthorized") return 401;
  return null;
}
