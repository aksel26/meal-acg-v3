export interface UsageRecordFilters {
  period?: string;
  type?: string;
  types?: string[];
  member_id?: string;
  member_ids?: string[];
  review_status?: string;
  review_statuses?: string[];
  description_search?: string;
  notes_search?: string;
  used_at_from?: string;
  used_at_to?: string;
  created_at_from?: string;
  created_at_to?: string;
  amounts?: number[];
}

export function buildUsageRecordSearchParams(filters: UsageRecordFilters) {
  const params = new URLSearchParams();
  const entries: [keyof UsageRecordFilters, string | undefined][] = [
    ["period", filters.period],
    ["type", filters.type],
    ["member_id", filters.member_id],
    ["review_status", filters.review_status],
    ["description_search", filters.description_search],
    ["notes_search", filters.notes_search],
    ["used_at_from", filters.used_at_from],
    ["used_at_to", filters.used_at_to],
    ["created_at_from", filters.created_at_from],
    ["created_at_to", filters.created_at_to],
  ];

  for (const [key, value] of entries) {
    const trimmed = value?.trim();
    if (trimmed) params.set(key, trimmed);
  }

  if (filters.amounts?.length) {
    params.set("amounts", filters.amounts.join(","));
  }
  if (filters.types?.length) {
    params.set("types", filters.types.join(","));
  }
  if (filters.member_ids?.length) {
    params.set("member_ids", filters.member_ids.join(","));
  }
  if (filters.review_statuses?.length) {
    params.set("review_statuses", filters.review_statuses.join(","));
  }

  return params;
}

export const USAGE_RECORD_PAGE_SIZE = 50;

export function addCustomAmount(amounts: number[], input: string) {
  const value = input.trim().replaceAll(",", "");
  if (!value) return amounts;
  const amount = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(amount)) return null;
  return [...new Set([...amounts, amount])].sort((a, b) => a - b);
}

export function parseUsageRecordPage(value: string | null) {
  if (value === null) return 1;
  if (!/^\d+$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) &&
    page > 0 &&
    Number.isSafeInteger(page * USAGE_RECORD_PAGE_SIZE)
    ? page
    : null;
}

export async function collectUsageRecordAmounts(
  fetchPage: (afterId?: string) => Promise<{ id: string; amount: number }[]>,
) {
  const amounts = new Set<number>();
  let afterId: string | undefined;
  // ponytail: 전체 금액 옵션은 O(n) 서버 조회. 데이터가 더 커지면 DB DISTINCT 집계로 전환한다.
  while (true) {
    const rows = await fetchPage(afterId);
    if (rows.length === 0) break;
    for (const row of rows) {
      if (Number.isFinite(row.amount)) amounts.add(row.amount);
    }
    afterId = rows[rows.length - 1]!.id;
  }
  return [...amounts].sort((a, b) => b - a);
}
