import { ValidationError, uuid } from "@/lib/validation";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const POSTGRES_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

export function page(search: URLSearchParams) {
  const requested = Number(search.get("limit") || DEFAULT_LIMIT);
  const limit = Number.isInteger(requested)
    ? Math.min(Math.max(requested, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const cursor = decodeCursor(search.get("cursor"));
  return { limit, cursor };
}

export function encodeCursor(row: { created_at: string; id: string }) {
  return Buffer.from(JSON.stringify([row.created_at, row.id])).toString(
    "base64url",
  );
}

function decodeCursor(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString());
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      typeof parsed[0] !== "string" ||
      !POSTGRES_TIMESTAMP.test(parsed[0]) ||
      Number.isNaN(Date.parse(parsed[0]))
    ) {
      throw new Error();
    }
    return {
      createdAt: parsed[0],
      id: uuid(parsed[1]),
    };
  } catch {
    throw new ValidationError("페이지 커서가 올바르지 않습니다.");
  }
}

export function withNextCursor<T extends { created_at: string; id: string }>(
  rows: T[],
  limit: number,
) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    nextCursor: hasMore ? encodeCursor(items[items.length - 1]!) : null,
  };
}
