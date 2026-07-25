import assert from "node:assert/strict";
import test from "node:test";
import { getMonthDateRange } from "../lib/date-utils.ts";

test("month range includes the last day regardless of process timezone", () => {
  assert.deepEqual(getMonthDateRange(2026, 7), {
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  });
  assert.deepEqual(getMonthDateRange(2028, 2), {
    startDate: "2028-02-01",
    endDate: "2028-02-29",
  });
});
