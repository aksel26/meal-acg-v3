import type { AuthSession } from "@/lib/supabase/types";

const SIGNATURE_ALGORITHM = "SHA-256";

// 세션 유효기간(초). 쿠키 maxAge와 서명 페이로드의 exp를 일치시키기 위해 이 모듈에서 단일 정의한다.
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

type SignedSessionPayload = AuthSession & { iat: number; exp: number };

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
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (secret) return secret;

  // 로컬 개발 환경에서만 고정 시크릿을 허용한다.
  // production/preview/staging 등 그 외 모든 환경에서는 전용 시크릿이 필수다.
  if (process.env.NODE_ENV === "development") {
    return "meal-acg-v3-admin-session-dev-secret";
  }

  throw new Error("ADMIN_SESSION_SECRET is required");
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
  const issuedAt = Math.floor(Date.now() / 1000);
  const payloadData: SignedSessionPayload = {
    ...session,
    iat: issuedAt,
    exp: issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS,
  };
  const payload = base64UrlEncode(JSON.stringify(payloadData));
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
    const parsed = JSON.parse(
      base64UrlDecode(payload),
    ) as Partial<SignedSessionPayload>;

    // 만료 검증: exp가 없거나(구버전 쿠키 포함) 만료된 경우 거부한다.
    if (typeof parsed.exp !== "number" || Date.now() / 1000 > parsed.exp) {
      return null;
    }

    const { iat: _iat, exp: _exp, ...session } = parsed;
    return session as AuthSession;
  } catch {
    return null;
  }
}
