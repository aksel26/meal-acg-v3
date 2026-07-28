import assert from "node:assert/strict";

const datePath = "./date.ts";
const { todayInSeoul } = (await import(datePath)) as typeof import("./date");

assert.equal(todayInSeoul(new Date("2026-07-27T14:59:59.999Z")), "2026-07-27");
assert.equal(todayInSeoul(new Date("2026-07-27T15:00:00.000Z")), "2026-07-28");
