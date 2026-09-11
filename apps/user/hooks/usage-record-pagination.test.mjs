import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { queryKeys } from "../lib/query-keys.ts";

function loadModule(path, modules, fetch) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "exports", "fetch", "console", code)(
    (name) => {
      assert.ok(name in modules, `Unexpected dependency: ${name}`);
      return modules[name];
    }, exports, fetch, { error() {} },
  );
  return exports;
}

function loadRoute(records = [], serverCap = 1000, failAfter = Infinity) {
  const queries = [];
  const tables = [];
  const supabase = {
    from(table) {
      tables.push(table);
      const calls = [];
      const query = {};
      for (const method of ["select", "eq", "gte", "lte", "lt", "gt", "order", "limit", "range", "overrideTypes"]) {
        query[method] = (...args) => { calls.push([method, ...args]); return query; };
      }
      query.single = async () => ({ data: { organization_id: "org-1" }, error: null });
      query.then = (resolve, reject) => {
        assert.equal(table, "usage_records");
        queries.push(calls);
        if (queries.length > failAfter) return Promise.resolve({ data: null, error: new Error("DB unavailable") }).then(resolve, reject);
        const cursor = calls.find(([method]) => method === "gt")?.[2];
        const range = calls.find(([method]) => method === "range");
        const rows = records.filter((record) => !cursor || record.id > cursor);
        const data = range ? rows.slice(range[1], range[2] + 1) : rows.slice(0, serverCap);
        return Promise.resolve({ data, count: records.length, error: null }).then(resolve, reject);
      };
      return query;
    },
  };
  const { GET } = loadModule("../app/api/points/all-records/route.ts", {
    "next/server": { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } },
    "@/lib/supabase/client": { createServiceClient: () => supabase },
  });
  return { queries, tables, get: (params = "") => GET({ url: `http://localhost/api/points/all-records?member_id=current&${params}` }) };
}

const rows = Array.from({ length: 2501 }, (_, index) => ({
  id: String(index).padStart(5, "0"), amount: index * 100, type: "활동비",
  description: "식사", used_at: "2026-01-31", member: { full_name: "직원" },
}));

test("목록 hook은 has_more가 true여도 1회만 요청하고 합계 캐시는 페이지와 분리한다", async () => {
  const requests = [];
  const hooks = loadModule("./use-all-usage-records.ts", {
    "@tanstack/react-query": { useQuery: (options) => options },
    "@/lib/query-keys": { queryKeys },
  }, async (url) => {
    requests.push(new URL(url, "http://localhost"));
    return { ok: true, json: async () => ({ records: rows.slice(0, 50), total_count: rows.length, has_more: true }) };
  });
  const filters = { memberId: "current", period: "2026-01", type: "활동비" };
  const page = hooks.useAllUsageRecords({ ...filters, limit: 50, offset: 50 });
  await page.queryFn();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].searchParams.get("offset"), "50");
  const summary = hooks.useAllUsageRecordsSummary(filters);
  assert.notDeepEqual(page.queryKey, summary.queryKey);
  assert.deepEqual(summary.queryKey, [...queryKeys.points.allRecords.all, "summary", filters]);
  await summary.queryFn();
  assert.equal(requests[1].searchParams.get("summary"), "true");
  assert.equal(requests[1].searchParams.has("offset"), false);
  assert.equal(requests[1].searchParams.has("limit"), false);
  assert.equal(hooks.useAllUsageRecords(null).enabled, false);
  assert.equal(hooks.useAllUsageRecordsSummary(null).enabled, false);
});

test("범위를 벗어난 페이지 입력은 DB 조회 전에 400으로 거절한다", async () => {
  const { get, tables } = loadRoute();
  for (const params of ["limit=0", "limit=101", "limit=1.5", "limit=x", "offset=-1", "offset=1.5", "offset=9007199254740991", "period=2026-13", "review_status=3", "type=unknown"]) {
    assert.equal((await get(params)).status, 400, params);
  }
  assert.equal(tables.length, 0);
});

test("목록은 50건과 전체 건수를 반환하고 offset 및 고유 ID 정렬을 사용한다", async () => {
  const { get, queries } = loadRoute(rows);
  const response = await get("offset=50");
  assert.equal(response.status, 200);
  assert.equal(response.data.records.length, 50);
  assert.equal(response.data.records[0].id, rows[50].id);
  assert.equal(response.data.total_count, rows.length);
  assert.equal(response.data.has_more, true);
  assert.deepEqual(queries[0].find(([method]) => method === "range"), ["range", 50, 99]);
  assert.deepEqual(queries[0].filter(([method]) => method === "order"), [
    ["order", "used_at", { ascending: false }],
    ["order", "created_at", { ascending: false }],
    ["order", "id", { ascending: false }],
  ]);
  assert.deepEqual(queries[0].find(([method]) => method === "select")[2], { count: "exact" });
});

test("합계는 서버 cap이 1000보다 작아도 조직 및 모든 필터를 유지하며 마지막 행까지 합산한다", async () => {
  const { get, queries } = loadRoute(rows, 137);
  const filters = "period=2026-H1&type=활동비&filter_member_id=selected&review_status=2";
  const page = await get(filters);
  const pageFilters = queries[0].filter(([method]) => ["eq", "gte", "lte", "lt"].includes(method));
  const result = await get(`${filters}&summary=true`);
  assert.equal(page.status, 200);
  assert.equal(result.status, 200);
  assert.equal(result.data.total_count, rows.length);
  assert.equal(result.data.total_amount, rows.reduce((sum, row) => sum + row.amount, 0));
  assert.deepEqual(result.data.records, []);
  assert.equal(queries.length, 1 + Math.ceil(rows.length / 137) + 1);
  assert.deepEqual(pageFilters, [
    ["eq", "member.organization_id", "org-1"],
    ["gte", "used_at", "2026-01-01"],
    ["lte", "used_at", "2026-06-30"],
    ["eq", "type", "활동비"],
    ["eq", "member_id", "selected"],
    ["eq", "review_status", 2],
  ]);
  for (const query of queries.slice(1)) {
    assert.deepEqual(query.filter(([method]) => ["eq", "gte", "lte", "lt"].includes(method)), pageFilters);
    assert.equal(query.find(([method]) => method === "select")[1], "id, amount, member:members!usage_records_member_id_fkey!inner()");
    assert.equal(query.some(([method]) => method === "range"), false);
  }
});

test("월별 목록과 합계는 한국 시간대에서도 월 마지막 날을 포함한다", async () => {
  const previousTZ = process.env.TZ;
  process.env.TZ = "Asia/Seoul";
  try {
    const { get, queries } = loadRoute();
    await get("period=2026-01");
    await get("period=2026-01&summary=true");
    for (const query of queries) {
      assert.deepEqual(query.find(([method]) => method === "gte"), ["gte", "used_at", "2026-01-01"]);
      assert.deepEqual(query.find(([method]) => method === "lt"), ["lt", "used_at", "2026-02-01"]);
    }
  } finally {
    if (previousTZ === undefined) delete process.env.TZ;
    else process.env.TZ = previousTZ;
  }
});

test("합계의 후속 조회가 실패하면 부분 합계를 성공 응답으로 반환하지 않는다", async () => {
  const { get } = loadRoute(rows, 137, 1);
  assert.equal((await get("summary=true")).status, 500);
});
