type SessionPayload = {
  userId: string;
  fullName: string;
  role: string;
  canEdit: boolean;
  exp: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(
    base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="),
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function getSecret() {
  const secret = process.env.SUPERVISOR_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "development") {
    return "meal-acg-v3-supervisor-session-dev-secret";
  }
  throw new Error("SUPERVISOR_SESSION_SECRET is required");
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(value: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

async function hasValidSignature(value: string, signature: string) {
  try {
    return crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      base64UrlToBytes(signature),
      new TextEncoder().encode(value),
    );
  } catch {
    return false;
  }
}

export async function encodeSessionCookie(
  session: Omit<SessionPayload, "exp">,
  maxAgeSeconds = 7 * 24 * 60 * 60,
) {
  return encodeSignedCookie(session, maxAgeSeconds);
}

export async function encodeSignedCookie(
  payloadValue: Record<string, unknown>,
  maxAgeSeconds: number,
) {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        ...payloadValue,
        exp: Date.now() + maxAgeSeconds * 1000,
      }),
    ),
  );
  return `${payload}.${await sign(payload)}`;
}

export async function decodeSignedCookie(value: string) {
  const [payload, signature, ...rest] = value.split(".");
  if (!payload || !signature || rest.length) return null;
  if (!(await hasValidSignature(payload, signature))) return null;

  try {
    const decoded = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload)),
    ) as Record<string, unknown>;
    if (typeof decoded.exp !== "number" || decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function decodeSessionCookie(value: string) {
  const session = await decodeSignedCookie(value);
  if (!session) return null;

  try {
    if (
      typeof session.userId !== "string" ||
      typeof session.fullName !== "string" ||
      typeof session.role !== "string" ||
      typeof session.canEdit !== "boolean" ||
      typeof session.exp !== "number"
    ) {
      return null;
    }
    return session as SessionPayload;
  } catch {
    return null;
  }
}
