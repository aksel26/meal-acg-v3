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
