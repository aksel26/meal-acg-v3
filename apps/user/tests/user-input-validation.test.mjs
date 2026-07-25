import assert from "node:assert/strict";
import test from "node:test";
import {
  isPositiveIntegerAmount,
  isValidUsageDate,
  parseNonNegativeInteger,
} from "../lib/input-validation.ts";

test("meal amounts accept only non-negative integers", () => {
  assert.equal(parseNonNegativeInteger("12000"), 12000);
  assert.equal(parseNonNegativeInteger(""), 0);
  assert.equal(parseNonNegativeInteger(-1), null);
  assert.equal(parseNonNegativeInteger("1.5"), null);
  assert.equal(parseNonNegativeInteger(2_147_483_647), 2_147_483_647);
  assert.equal(parseNonNegativeInteger(2_147_483_648), null);
});

test("point amounts and dates reject malformed input", () => {
  assert.equal(isPositiveIntegerAmount(12000), true);
  assert.equal(isPositiveIntegerAmount(0), false);
  assert.equal(isPositiveIntegerAmount(-1), false);
  assert.equal(isPositiveIntegerAmount(2_147_483_647), true);
  assert.equal(isPositiveIntegerAmount(2_147_483_648), false);
  assert.equal(isValidUsageDate("2026-07-23"), true);
  assert.equal(isValidUsageDate("2026-02-30"), false);
});
