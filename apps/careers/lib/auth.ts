import { cookies } from "next/headers";

import {
  decodeSessionCookie,
  encodeSessionCookie,
  SESSION_MAX_AGE_SECONDS,
} from "./session-cookie";
import { createPublicServiceClient } from "./supabase/server";

const SESSION_COOKIE_NAME = "careers-session";

export type CareersAdmin = {
  id: string;
  fullName: string;
  role: "admin";
};

type AuthSession = {
  userId: string;
  fullName: string;
  role: "admin";
};

export class AuthError extends Error {
  constructor(
    message: string,
    public status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function setSession(session: AuthSession) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, await encodeSessionCookie(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function getSession() {
  const value = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return value ? decodeSessionCookie(value) : null;
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

export async function resolveFreshAdmin(
  session: Pick<AuthSession, "userId">,
): Promise<CareersAdmin | null> {
  const supabase = createPublicServiceClient();
  const [
    { data: member, error: memberError },
    { data: status, error: statusError },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, role")
      .eq("id", session.userId)
      .maybeSingle(),
    supabase
      .from("member_current_status")
      .select("current_status")
      .eq("member_id", session.userId)
      .maybeSingle(),
  ]);

  if (
    memberError ||
    statusError ||
    !member ||
    member.role !== "admin" ||
    status?.current_status === "퇴사"
  ) {
    return null;
  }
  return { id: member.id, fullName: member.full_name, role: "admin" };
}

export async function requireCareersAdmin(): Promise<CareersAdmin> {
  const session = await getSession();
  if (!session) throw new AuthError("Unauthorized", 401);

  const admin = await resolveFreshAdmin(session);
  if (!admin) {
    try {
      await clearSession();
    } catch {
      // Server Components cannot mutate cookies; the stale cookie remains unusable.
    }
    throw new AuthError("Forbidden", 403);
  }
  return admin;
}
