type SessionPayload = {
  userId: string;
  fullName: string;
  role: "admin";
  exp: number;
};

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

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
  const secret = process.env.CAREERS_SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error(
      "CAREERS_SESSION_SECRET is required and must be at least 32 UTF-8 bytes",
    );
  }
  return secret;
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

export async function encodeSessionCookie(
  session: Omit<SessionPayload, "exp">,
) {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        ...session,
        exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
      }),
    ),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(),
    new TextEncoder().encode(payload),
  );
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function decodeSessionCookie(value: string) {
  const [payload, signature, ...rest] = value.split(".");
  if (!payload || !signature || rest.length) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      base64UrlToBytes(signature),
      new TextEncoder().encode(payload),
    );
    if (!valid) return null;

    const session = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload)),
    ) as Partial<SessionPayload>;
    if (
      typeof session.userId !== "string" ||
      typeof session.fullName !== "string" ||
      session.role !== "admin" ||
      typeof session.exp !== "number" ||
      session.exp < Date.now()
    ) {
      return null;
    }
    return session as SessionPayload;
  } catch {
    return null;
  }
}

export { SESSION_MAX_AGE_SECONDS };
