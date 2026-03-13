import { headers } from "next/headers";

export type SessionUser = {
  id: string;
  fullName: string;
  role: string;
};

export async function getSessionUser(): Promise<SessionUser> {
  const headerStore = await headers();
  const id = headerStore.get("x-session-user-id");
  const fullName = headerStore.get("x-session-user-name");
  const role = headerStore.get("x-session-user-role");

  if (!id || !fullName || !role) {
    throw new Error("Unauthorized");
  }

  return { id, fullName, role };
}

export async function requireAuth(): Promise<SessionUser> {
  return getSessionUser();
}
