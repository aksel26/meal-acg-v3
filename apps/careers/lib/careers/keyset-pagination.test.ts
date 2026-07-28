import assert from "node:assert/strict";

const paginationPath = "./keyset-pagination.ts";
const { chunkValues, collectKeysetPages, POSTING_STAGE_BATCH_SIZE } =
  await import(paginationPath);

const postingRows = Array.from({ length: 1_001 }, (_, index) => ({
  id: String(index + 1).padStart(4, "0"),
}));
let pageCalls = 0;
const collectedRows: Array<{ id: string }> = await collectKeysetPages(
  async (cursor: string | null) => {
    pageCalls += 1;
    return postingRows
      .filter((row) => cursor === null || row.id > cursor)
      .slice(0, 1_000);
  },
);

assert.equal(collectedRows.length, 1_001);
assert.equal(new Set(collectedRows.map((row) => row.id)).size, 1_001);
assert.equal(collectedRows[1_000]?.id, "1001");
assert.equal(pageCalls, 2);

const postingIds = Array.from(
  { length: 101 },
  (_, index) => `posting-${index + 1}`,
);
const postingBatches: string[][] = chunkValues(
  postingIds,
  POSTING_STAGE_BATCH_SIZE,
);
const stageRowsPerBatch = postingBatches.map((batch) => batch.length * 20);

assert.deepEqual(
  postingBatches.map((batch) => batch.length),
  [50, 50, 1],
);
assert.equal(Math.max(...stageRowsPerBatch), 1_000);
assert.equal(
  stageRowsPerBatch.reduce((total, count) => total + count, 0),
  2_020,
);
