import assert from "node:assert/strict";
import {
  classifyMessage,
  buildLeaveBalanceAnswer,
  buildStatutoryAnnualAnswer,
  buildHalfDayAnswer,
  buildUnsupportedAnswer,
} from "./answers";

// 빠른 질문 3종 (HANDOFF 8.2 원문) 분류
assert.equal(classifyMessage("내 휴가 얼마나 남았어?"), "leave_balance");
assert.equal(classifyMessage("원래 법정 연차는 며칠이야?"), "statutory_annual");
assert.equal(classifyMessage("반차/반반차 규정 알려줘"), "half_day_policy");

// 변형 질문
assert.equal(classifyMessage("연차 잔여일수 알려줘"), "leave_balance");
assert.equal(classifyMessage("연차 부여 기준이 뭐야"), "statutory_annual");
assert.equal(classifyMessage("반반차는 어떻게 써?"), "half_day_policy");

// 지원 범위 밖 → 거절 (식대/일반 잡담)
assert.equal(classifyMessage("식대 얼마 남았어?"), "unsupported");
assert.equal(classifyMessage("오늘 점심 뭐 먹지"), "unsupported");

// 개인 휴가 — 서버 계산값 그대로 템플릿에 들어감
const leave = buildLeaveBalanceAnswer(
  { total: 18, used: 5, remaining: 13 },
  2026,
  "2026-07-30",
);
assert.equal(leave.kind, "leave_balance");
assert.ok(leave.answer.includes("총 18일"));
assert.ok(leave.answer.includes("5일 사용"));
assert.ok(leave.answer.includes("13일 남았"));
assert.equal(leave.asOf, "2026-07-30");
assert.equal(leave.sources[0]?.href, "/attendance-stats");
assert.equal(leave.sources[0]?.type, "personal");

// 소수점 잔액 표기 (반반차 0.25 단위)
const fractional = buildLeaveBalanceAnswer(
  { total: 15, used: 4.5, remaining: 10.5 },
  2026,
  "2026-07-30",
);
assert.ok(fractional.answer.includes("10.5일 남았"));

// 데이터 없음 → 추측 없이 확인 불가 안내 (HANDOFF 8.10)
const empty = buildLeaveBalanceAnswer(
  { total: 0, used: 0, remaining: 0 },
  2026,
  "2026-07-30",
);
assert.ok(empty.answer.includes("확인할 수 없습니다"));

// 법정 기준 — 법 출처 + ACG 사규 출처, 개인 잔액으로 표현 금지
const statutory = buildStatutoryAnnualAnswer();
assert.equal(statutory.kind, "statutory_annual");
assert.equal(statutory.sources.length, 2);
assert.ok(statutory.sources.some((s) => s.type === "law"));
assert.ok(statutory.sources.some((s) => s.id === "l1"));
assert.ok(!statutory.answer.includes("남았습니다"));

// 반차 — 게시 문구 기반 + 개정일 출처
const halfDay = buildHalfDayAnswer();
assert.equal(halfDay.kind, "half_day_policy");
assert.ok(halfDay.answer.includes("반반차"));
assert.equal(halfDay.sources[0]?.id, "l2");
assert.equal(halfDay.sources[0]?.type, "regulation");

// 범위 밖 거절
const unsupported = buildUnsupportedAnswer("2026-07-30");
assert.equal(unsupported.kind, "unsupported");
assert.equal(unsupported.sources.length, 0);

console.log("answers.test OK");
