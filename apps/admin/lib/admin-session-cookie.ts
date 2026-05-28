import type { AuthSession } from "@/lib/supabase/types";

const SIGNATURE_ALGORITHM = "SHA-256";

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function base64UrlEncode(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlDecode(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function getAdminSessionSecret() {
  const secret =
    process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET is required in production");
  }

  return "meal-acg-v3-admin-session-dev-secret";
}

async function signPayload(payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAdminSessionSecret()),
    { name: "HMAC", hash: SIGNATURE_ALGORITHM },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqualString(a: string, b: string) {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  if (aBytes.length !== bBytes.length) return false;

  let diff = 0;
  for (let index = 0; index < aBytes.length; index += 1) {
    diff |= aBytes[index]! ^ bBytes[index]!;
  }
  return diff === 0;
}

export async function encodeAdminSessionCookie(session: AuthSession) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

export async function decodeAdminSessionCookie(
  cookieValue: string | undefined,
): Promise<AuthSession | null> {
  if (!cookieValue) return null;

  const [payload, signature, ...rest] = cookieValue.split(".");
  if (!payload || !signature || rest.length > 0) return null;

  const expectedSignature = await signPayload(payload);
  if (!timingSafeEqualString(signature, expectedSignature)) return null;

  try {
    return JSON.parse(base64UrlDecode(payload)) as AuthSession;
  } catch {
    return null;
  }
}
