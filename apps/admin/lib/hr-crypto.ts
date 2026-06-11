import "server-only";
import crypto from "node:crypto";

const KEY_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.HR_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("HR_ENCRYPTION_KEY is not configured");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("HR_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return key;
}

export function encryptField(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, authTag, ciphertext]);
  return `${KEY_VERSION}:${packed.toString("base64")}`;
}

export function decryptField(enc: string | null | undefined): string | null {
  if (enc == null || enc === "") return null;
  const sep = enc.indexOf(":");
  const version = enc.slice(0, sep);
  const payload = enc.slice(sep + 1);
  if (version !== KEY_VERSION || !payload) {
    throw new Error("Unsupported HR ciphertext format");
  }
  const packed = Buffer.from(payload, "base64");
  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
