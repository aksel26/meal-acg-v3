import type { JsonObject } from "@/lib/types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEARCH_TERM = /^[\p{L}\p{M}\p{N} @._+-]+$/u;

export class ValidationError extends Error {}

export function object(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("요청 형식이 올바르지 않습니다.");
  }
  return value as JsonObject;
}

export async function json(request: Request) {
  try {
    return object(await request.json());
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("JSON 요청 본문이 올바르지 않습니다.");
  }
}

export function uuid(value: unknown, label = "ID") {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new ValidationError(`${label} 형식이 올바르지 않습니다.`);
  }
  return value;
}

export function text(
  value: unknown,
  label: string,
  options: { required?: boolean; max?: number } = {},
) {
  if (value == null || value === "") {
    if (options.required)
      throw new ValidationError(`${label}은(는) 필수입니다.`);
    return null;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${label} 형식이 올바르지 않습니다.`);
  }
  const result = value.trim();
  if (options.required && !result) {
    throw new ValidationError(`${label}은(는) 필수입니다.`);
  }
  if (result.length > (options.max ?? 10_000)) {
    throw new ValidationError(`${label}은(는) 너무 깁니다.`);
  }
  return result || null;
}

export function optionalUuid(value: unknown, label = "ID") {
  return value == null || value === "" ? null : uuid(value, label);
}

export function searchTerm(value: unknown) {
  const result = text(value, "검색어", { max: 100 });
  if (result && !SEARCH_TERM.test(result)) {
    throw new ValidationError(
      "검색어에 허용되지 않는 문자가 포함되어 있습니다.",
    );
  }
  return result;
}

export function oneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
  fallback?: T[number],
) {
  if (value == null && fallback !== undefined) return fallback;
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ValidationError(`${label} 값이 올바르지 않습니다.`);
  }
  return value as T[number];
}

export function boolean(value: unknown, fallback = false) {
  if (value == null) return fallback;
  if (typeof value !== "boolean") {
    throw new ValidationError("참/거짓 값이 올바르지 않습니다.");
  }
  return value;
}

export function integer(value: unknown, label: string, fallback?: number) {
  if (value == null && fallback !== undefined) return fallback;
  if (!Number.isSafeInteger(value)) {
    throw new ValidationError(`${label} 값이 올바르지 않습니다.`);
  }
  return value as number;
}

export function dateTime(value: unknown, label: string, required = false) {
  const parsed = text(value, label, { required, max: 64 });
  if (!parsed) return null;
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${label} 값이 올바르지 않습니다.`);
  }
  return date.toISOString();
}
