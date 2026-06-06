import test from "node:test";
import assert from "node:assert/strict";

import { buildUsageRecordSearchParams } from "./usage-record-filters.ts";

test("buildUsageRecordSearchParams includes text, date range, status, and selected amount filters", () => {
  const params = buildUsageRecordSearchParams({
    period: "2026-H1",
    type: "복지포인트",
    member_id: "member-1",
    review_status: "1",
    types: ["복지포인트", "활동비"],
    member_ids: ["member-1", "member-2"],
    review_statuses: ["1", "2"],
    description_search: "문구",
    notes_search: "대리",
    used_at_from: "2026-01-02",
    used_at_to: "2026-03-04",
    created_at_from: "2026-01-05",
    created_at_to: "2026-03-06",
    amounts: [15000, 30000],
  });

  assert.equal(
    params.toString(),
    "period=2026-H1&type=%EB%B3%B5%EC%A7%80%ED%8F%AC%EC%9D%B8%ED%8A%B8&member_id=member-1&review_status=1&description_search=%EB%AC%B8%EA%B5%AC&notes_search=%EB%8C%80%EB%A6%AC&used_at_from=2026-01-02&used_at_to=2026-03-04&created_at_from=2026-01-05&created_at_to=2026-03-06&amounts=15000%2C30000&types=%EB%B3%B5%EC%A7%80%ED%8F%AC%EC%9D%B8%ED%8A%B8%2C%ED%99%9C%EB%8F%99%EB%B9%84&member_ids=member-1%2Cmember-2&review_statuses=1%2C2",
  );
});

test("buildUsageRecordSearchParams omits empty values and all amount filters", () => {
  const params = buildUsageRecordSearchParams({
    period: "2026-H1",
    type: undefined,
    member_id: "",
    review_status: undefined,
    description_search: "  ",
    notes_search: "",
    amounts: [],
  });

  assert.equal(params.toString(), "period=2026-H1");
});
