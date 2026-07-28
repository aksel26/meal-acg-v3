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

console.log("PASS: company operations utility checks");
NODE
