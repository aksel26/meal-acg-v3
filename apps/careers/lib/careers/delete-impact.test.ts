import assert from "node:assert/strict";

const helperPath = "./delete-impact.ts";
const {
  beginDeleteImpact,
  canConfirmDeleteImpact,
  parseAffectedApplications,
  rejectDeleteImpact,
  resolveDeleteImpact,
} = (await import(helperPath)) as typeof import("./delete-impact");

assert.equal(canConfirmDeleteImpact({ status: "idle" }, "A"), false);

const requestA = beginDeleteImpact("A", 1);
const requestB = beginDeleteImpact("B", 2);
assert.deepEqual(resolveDeleteImpact(requestB, "A", 1, 7), requestB);
assert.deepEqual(rejectDeleteImpact(requestB, "A", 1, "늦은 실패"), requestB);

const loadedB = resolveDeleteImpact(requestB, "B", 2, 0);
assert.equal(canConfirmDeleteImpact(loadedB, "A"), false);
assert.equal(canConfirmDeleteImpact(loadedB, "B"), true);
assert.equal(
  canConfirmDeleteImpact(
    rejectDeleteImpact(requestA, "A", 1, "조회 실패"),
    "A",
  ),
  false,
);

assert.equal(parseAffectedApplications(0), 0);
assert.equal(parseAffectedApplications(3), 3);
for (const malformed of [undefined, null, "0", -1, 1.5, Number.NaN, Infinity]) {
  assert.throws(
    () => parseAffectedApplications(malformed),
    /응답이 올바르지 않습니다/,
  );
}
