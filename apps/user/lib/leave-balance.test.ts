import assert from "node:assert/strict";
import { summarizeLeaveBalances } from "./leave-balance";

// annual+monthly만 집계, summer 등 다른 type 제외
{
  const summary = summarizeLeaveBalances([
    { type: "annual", granted: 15, used: 4.5, adjusted: 1 },
    { type: "monthly", granted: 2, used: 0.5, adjusted: 0 },
    { type: "summer", granted: 3, used: 3, adjusted: 0 },
  ]);
  assert.equal(summary.total, 18);
  assert.equal(summary.used, 5);
  assert.equal(summary.remaining, 13);
}

// 빈 배열
assert.deepEqual(summarizeLeaveBalances([]), {
  total: 0,
  used: 0,
  remaining: 0,
});

console.log("leave-balance.test OK");
