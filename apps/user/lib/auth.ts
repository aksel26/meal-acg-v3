import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/client";

const COOKIE_NAME = "acg_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type SessionUser = {
  id: string;
  fullName: string;
  role: string | null;
};

type SessionPayload = {
  userId: string;
  role: string | null;
  exp: number; // epoch ms
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (typeof parsed.userId !== "string") return null;
    if (typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildSessionCookie(userId: string, role: string | null) {
  const exp = Date.now() + COOKIE_MAX_AGE_SECONDS * 1000;
  return {
    name: COOKIE_NAME,
    value: sign({ userId, role, exp }),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  };
}

export function buildLogoutCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  };
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  return verify(token);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data: member, error } = await supabase
    .from("members")
    .select("id, full_name, role")
    .eq("id", payload.userId)
    .single();

  if (error || !member) return null;

  return {
    id: member.id,
    fullName: member.full_name,
    role: member.role ?? null,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
