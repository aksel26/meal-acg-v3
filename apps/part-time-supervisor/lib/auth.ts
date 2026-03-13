import { cookies, headers } from "next/headers";

export type SessionUser = {
  id: string;
  fullName: string;
  role: string;
};

type AuthSession = {
  userId: string;
  fullName: string;
  role: string;
};

const SESSION_COOKIE_NAME = "supervisor-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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

export async function getSessionUser(): Promise<SessionUser> {
  const headerStore = await headers();
  const id = headerStore.get("x-session-user-id");
  const rawName = headerStore.get("x-session-user-name");
  const fullName = rawName ? decodeURIComponent(rawName) : null;
  const role = headerStore.get("x-session-user-role");

  if (!id || !fullName || !role) {
    throw new Error("Unauthorized");
  }

  return { id, fullName, role };
}

export async function requireAuth(): Promise<SessionUser> {
  return getSessionUser();
}
