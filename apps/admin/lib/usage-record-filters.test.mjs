import test from "node:test";
import assert from "node:assert/strict";

import { addCustomAmount, buildUsageRecordSearchParams } from "./usage-record-filters.ts";

test("직접 입력 금액은 기존 선택에 중복 없이 추가하고 잘못된 금액은 거절한다", () => {
  assert.deepEqual(addCustomAmount([600], "1,000"), [600, 1000]);
  assert.deepEqual(addCustomAmount([600], "600"), [600]);
  assert.deepEqual(addCustomAmount([600], " "), [600]);
  assert.deepEqual(addCustomAmount([], "0"), [0]);
  for (const input of ["-1", "1.5", "abc", "1e3", "9007199254740992"]) {
    assert.equal(addCustomAmount([], input), null);
  }
});

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

const { collectUsageRecordAmounts, parseUsageRecordPage } = await import(
  "./usage-record-filters.ts"
);

test("pagination defaults to page one and rejects invalid or overflowing ranges", () => {
  assert.equal(parseUsageRecordPage(null), 1);
  assert.equal(parseUsageRecordPage("2"), 2);
  for (const value of [
    "",
    "0",
    "-1",
    "1.5",
    "2x",
    "Infinity",
    "9007199254740991",
  ]) {
    assert.equal(parseUsageRecordPage(value), null);
  }
});

test("amount options traverse server-limited batches, deduplicate and sort all amounts", async () => {
  const records = Array.from({ length: 2501 }, (_, index) => ({
    id: String(index).padStart(5, "0"),
    amount: index % 100 === 0 ? 0 : index * 100,
  }));
  const cursors = [];
  const amounts = await collectUsageRecordAmounts(async (afterId) => {
    cursors.push(afterId);
    // 서버가 요청한 1000건보다 작은 137건으로 제한해도 끝까지 조회해야 한다.
    return records
      .filter((record) => !afterId || record.id > afterId)
      .slice(0, 137);
  });
  assert.deepEqual(
    amounts,
    [...new Set(records.map((record) => record.amount))].sort((a, b) => b - a),
  );
  assert.equal(cursors.length, Math.ceil(records.length / 137) + 1);
  assert.equal(cursors.at(-1), records.at(-1).id);
});

test("amount options propagate a failed later batch instead of returning incomplete options", async () => {
  await assert.rejects(
    collectUsageRecordAmounts(async (afterId) => {
      if (afterId) throw new Error("database unavailable");
      return [{ id: "1", amount: 15000 }];
    }),
    /database unavailable/,
  );
  assert.deepEqual(await collectUsageRecordAmounts(async () => []), []);
});
