// 배정 계산 자체 검증. 실행: node --experimental-strip-types apps/admin/lib/lunch-group-plan.check.ts
import assert from "node:assert/strict";
import { calculateLunchGroupPlan } from "./lunch-group-plan.ts";

const plan = (n: number, max = 4, min = 3) =>
  calculateLunchGroupPlan(n, max, min);

// 딱 나눠떨어지는 경우
assert.deepEqual(plan(8).slots, [4, 4]);
assert.deepEqual(plan(12).slots, [4, 4, 4]);

// 나머지는 앞 조부터 균등 분배 (최소 인원 충족)
assert.deepEqual(plan(7).slots, [4, 3]);
assert.deepEqual(plan(9).slots, [3, 3, 3]);
assert.deepEqual(plan(10).slots, [4, 3, 3]);
assert.deepEqual(plan(13).slots, [4, 3, 3, 3]);

// 최소 미달이 생기면 조를 줄여 최대 초과를 허용
assert.deepEqual(plan(5).slots, [5]);
assert.equal(plan(5).hasOverMax, true);
assert.deepEqual(plan(11).slots, [4, 4, 3]);
assert.deepEqual(plan(6).slots, [3, 3]);

// 인원 자체가 최소에 못 미치면 1개 조로 두고 미달 표시
assert.deepEqual(plan(2).slots, [2]);
assert.equal(plan(2).hasUnderMin, true);
assert.equal(plan(0).totalGroups, 0);

// 최소 > 최대로 입력해도 최대에 맞춰 보정
assert.deepEqual(plan(8, 4, 6).slots, [4, 4]);

// 최대/최소 값이 바뀌어도 동일 규칙
assert.deepEqual(plan(12, 5, 4).slots, [4, 4, 4]);
assert.deepEqual(plan(9, 3, 2).slots, [3, 3, 3]);

console.log("lunch-group-plan: 모든 검증 통과");
