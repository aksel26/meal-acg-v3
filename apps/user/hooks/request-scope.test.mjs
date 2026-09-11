import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { queryKeys as userKeys } from "../lib/query-keys.ts";
import { queryKeys as adminKeys } from "../../admin/lib/query-keys.ts";

function loadHooks(path, queryKeys, requests) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("require", "exports", "fetch", code)(
    (name) => name === "@tanstack/react-query"
      ? { useQuery: (options) => options }
      : { queryKeys },
    exports,
    async (url) => {
      requests.push(new URL(url, "http://localhost"));
      return { ok: true, json: async () => [] };
    },
  );
  return exports;
}

test("예산 조회는 열림 상태를 따르고 같은 반기는 캐시를 공유하며 멤버를 분리한다", async () => {
  const requests = [];
  const { usePointsDashboard, useAllocationRecords } = loadHooks("./use-points-data.ts", userKeys, requests);
  const january = usePointsDashboard("member-1", "2026-01", "활동비");
  const june = usePointsDashboard("member-1", "2026-06", "활동비");
  assert.deepEqual(january.queryKey, june.queryKey);
  assert.deepEqual(january.queryKey, usePointsDashboard("member-1", "2026-H1", "활동비").queryKey);
  assert.notDeepEqual(january.queryKey, usePointsDashboard("member-1", "2026-07", "활동비").queryKey);
  assert.notDeepEqual(january.queryKey, usePointsDashboard("member-2", "2026-01", "활동비").queryKey);
  assert.equal(usePointsDashboard("member-1", "2026-01", "활동비", false).enabled, false);
  assert.equal(usePointsDashboard(null, "2026-01").enabled, false);
  assert.equal(usePointsDashboard("member-1", "").enabled, false);
  assert.equal(useAllocationRecords(null, "allocation-1", "2026-01").enabled, false);
  assert.equal(january.enabled, true);
  assert.equal(january.placeholderData, undefined);
  await june.queryFn();
  assert.equal(requests[0].searchParams.get("period"), "2026-H1");
  assert.equal(requests[0].searchParams.get("member_id"), "member-1");
});

test("식대 조회는 직원 필터를 서버로 보내고 전체 및 다른 직원의 캐시와 분리한다", async () => {
  const requests = [];
  const { useMealLogs } = loadHooks("../../admin/hooks/useMealLogs.ts", adminKeys, requests);
  const all = useMealLogs(2026, 9);
  const selected = useMealLogs(2026, 9, "member-1");
  assert.deepEqual(all.queryKey, useMealLogs(2026, 9, "").queryKey);
  assert.deepEqual(selected.queryKey, adminKeys.mealLogs.byUserAndMonth("member-1", 2026, 9));
  assert.notDeepEqual(all.queryKey, selected.queryKey);
  assert.notDeepEqual(selected.queryKey, useMealLogs(2026, 9, "member-2").queryKey);
  assert.equal(selected.placeholderData, undefined);
  await all.queryFn();
  await selected.queryFn();
  assert.equal(requests[0].searchParams.has("userId"), false);
  assert.equal(requests[1].searchParams.get("userId"), "member-1");
  assert.equal(requests[1].searchParams.get("year"), "2026");
  assert.equal(requests[1].searchParams.get("month"), "9");
});

test("포인트 변경은 관련 내역과 합계만 무효화하고 멤버 정보는 다시 받지 않는다", () => {
  const exports = {};
  let invalidation;
  const code = ts.transpileModule(readFileSync(new URL("./use-points-mutations.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("require", "exports", code)(
    (name) => name === "@tanstack/react-query"
      ? { useMutation: (options) => options, useQueryClient: () => ({ invalidateQueries: (options) => { invalidation = options; } }) }
      : { queryKeys: userKeys },
    exports,
  );
  for (const hook of [exports.useAddUsageRecord, exports.useUpdateUsageRecord, exports.useDeleteUsageRecord]) {
    for (const type of ["welfare", "activity"]) {
      hook().onSuccess({}, { type });
      assert.deepEqual(invalidation.queryKey, ["points"]);
      for (const scope of [type, "dashboard", "allocationRecords", "allRecords"]) {
        assert.equal(invalidation.predicate({ queryKey: ["points", scope] }), true);
      }
      for (const scope of [type === "welfare" ? "activity" : "welfare", "members", "me"]) {
        assert.equal(invalidation.predicate({ queryKey: ["points", scope] }), false);
      }
    }
  }
});
