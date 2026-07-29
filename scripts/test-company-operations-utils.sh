#!/usr/bin/env bash
set -euo pipefail

test_dir="$(mktemp -d)"
trap 'rm -rf "$test_dir"' EXIT

apps/admin/node_modules/.bin/tsc packages/utils/company-operations.ts \
  --target ES2022 \
  --module commonjs \
  --outDir "$test_dir" \
  --skipLibCheck \
  --lib ES2022,DOM

node - "$test_dir/company-operations.js" <<'NODE'
const assert = require("node:assert/strict");
const operations = require(process.argv[2]);

assert.equal(operations.isOperationDate("2024-02-29"), true);
assert.equal(operations.isOperationDate("2023-02-29"), false);
assert.equal(operations.isOperationDate("2024-13-01"), false);

const pagination = operations.operationPage(
  new URLSearchParams("page=2&pageSize=2"),
);
assert.deepEqual(pagination, { page: 2, pageSize: 2, from: 2, to: 4 });
assert.deepEqual(operations.operationPageData([1, 2, 3], pagination), {
  items: [1, 2],
  pagination: { page: 2, pageSize: 2, hasMore: true },
});
assert.equal(
  operations.operationPage(new URLSearchParams("page=1e309")).page,
  1,
);

assert.equal(
  operations.operationSearch(new URLSearchParams("q=%25%2C_foo.bar")),
  "foobar",
);

const notice = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "주차 안내",
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
        },
      ],
    },
  ],
};
assert.deepEqual(operations.operationParkingNoticeContent(notice), notice);
assert.throws(
  () =>
    operations.operationParkingNoticeContent({
      ...notice,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "위험한 링크",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    }),
  /http 또는 https/,
);

assert.deepEqual(operations.operationParkingTicket("extra_3_hours"), {
  code: "extra_3_hours",
  label: "추가 3시간",
  fee: 4500,
});
assert.equal(operations.operationParkingUsageType("personal"), "personal");
assert.throws(
  () => operations.operationParkingTicket("all_day"),
  /시간권/,
);
assert.throws(
  () => operations.operationParkingUsageType("visitor"),
  /주차 구분/,
);

// 추가 시간권: 기본권 + 추가분의 합으로 주차비를 계산한다.
assert.equal(operations.parkingTicketFee("extra_1_hour"), 1500);
assert.equal(operations.parkingTicketFee("unknown_code"), 0);
assert.equal(operations.parkingTotalFee("two_hours"), 0);
assert.equal(
  operations.parkingTotalFee("extra_1_hour", [
    "extra_30_minutes",
    "extra_2_hours",
  ]),
  1500 + 750 + 3000,
);
// 같은 시간권을 여러 번 추가하면 그만큼 합산된다.
assert.equal(
  operations.parkingTotalFee("two_hours", ["extra_30_minutes", "extra_30_minutes"]),
  1500,
);
assert.deepEqual(operations.operationParkingExtraTickets(undefined), []);
assert.deepEqual(
  operations.operationParkingExtraTickets(["extra_1_hour", "extra_1_hour"]),
  ["extra_1_hour", "extra_1_hour"],
);
assert.throws(
  () => operations.operationParkingExtraTickets("extra_1_hour"),
  /추가 주차 시간권/,
);
assert.throws(
  () => operations.operationParkingExtraTickets(["all_day"]),
  /시간권/,
);
assert.throws(
  () => operations.operationParkingExtraTickets(new Array(21).fill("extra_1_hour")),
  /20개/,
);

console.log("PASS: company operations utility checks");
NODE
