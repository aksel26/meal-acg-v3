// /api/chat 응답 조립 — 전부 서버 템플릿, 모델 호출 없음
// (HANDOFF 8절 · 2026-07-30 결정: 첫 출시는 빠른 질문 3종만)
import { REGULATION_CATEGORIES, type Regulation } from "../regulations";
import type { LeaveSummary } from "../leave-balance";

export type ChatKind =
  | "leave_balance"
  | "statutory_annual"
  | "half_day_policy"
  | "unsupported";

export interface ChatSource {
  id: string;
  type: "personal" | "regulation" | "law";
  label: string;
  href: string;
  asOf: string;
}

export interface ChatAnswer {
  kind: ChatKind;
  answer: string;
  asOf: string;
  sources: ChatSource[];
}

// 근로기준법 제60조 — URL·확인일은 HANDOFF 8.4 기준 (콘텐츠 갱신 시 여기만 수정)
const STATUTE_SOURCE: ChatSource = {
  id: "labor-standards-act-60",
  type: "law",
  label: "근로기준법 제60조 (2026-07-30 확인)",
  href: "https://law.go.kr/LSW/LsiJoLinkP.do?languageType=KO&lsNm=%EA%B7%BC%EB%A1%9C%EA%B8%B0%EC%A4%80%EB%B2%95&paras=1",
  asOf: "2026-07-30",
};

export function classifyMessage(message: string): ChatKind {
  if (/반반?차/.test(message)) return "half_day_policy";
  if (
    message.includes("법정") ||
    (message.includes("부여") && message.includes("기준"))
  ) {
    return "statutory_annual";
  }
  if (/휴가|연차/.test(message) && /남|잔여|얼마|며칠/.test(message)) {
    return "leave_balance";
  }
  return "unsupported";
}

function findRegulation(id: string): Regulation {
  for (const category of REGULATION_CATEGORIES) {
    const found = category.regulations.find((r) => r.id === id);
    if (found) return found;
  }
  throw new Error(`사규 데이터에 없는 ID: ${id}`);
}

function regulationSource(id: string): ChatSource {
  const regulation = findRegulation(id);
  return {
    id: regulation.id,
    type: "regulation",
    label: `ACG 사규 · ${regulation.title} (${regulation.updatedAt} 개정)`,
    href: "/acg-life",
    asOf: regulation.updatedAt,
  };
}

function personalSource(year: number, today: string): ChatSource {
  return {
    id: `personal-leave-${year}`,
    type: "personal",
    label: `${year}년 내 휴가 데이터`,
    href: "/attendance-stats",
    asOf: today,
  };
}

function formatLeaveDays(value: number): string {
  return String(Number(value.toFixed(2)));
}

export function buildLeaveBalanceAnswer(
  summary: LeaveSummary,
  year: number,
  today: string,
): ChatAnswer {
  if (summary.total === 0 && summary.used === 0) {
    return {
      kind: "leave_balance",
      answer: `${year}년 휴가 데이터를 확인할 수 없습니다. HR에 문의해 주세요.`,
      asOf: today,
      sources: [personalSource(year, today)],
    };
  }
  return {
    kind: "leave_balance",
    answer: `${year}년 휴가는 총 ${formatLeaveDays(summary.total)}일이고 ${formatLeaveDays(summary.used)}일 사용해 ${formatLeaveDays(summary.remaining)}일 남았습니다.`,
    asOf: today,
    sources: [personalSource(year, today)],
  };
}

export function buildStatutoryAnnualAnswer(): ChatAnswer {
  return {
    kind: "statutory_annual",
    answer:
      '근로기준법 제60조 기준: 1년간 80% 이상 출근하면 연차 15일이 발생하고, 1년 미만 근무자는 1개월 개근 시 1일씩(최대 11일) 발생합니다. 3년 이상 근속부터는 최초 1년을 초과한 근속 2년마다 1일씩 가산되어 최대 25일까지 늘어납니다. 회사 부여 기준은 ACG 사규를 함께 확인하세요. 개인별 실제 잔여일수는 "내 휴가 얼마나 남았어?"로 물어보면 확인할 수 있습니다.',
    asOf: STATUTE_SOURCE.asOf,
    sources: [STATUTE_SOURCE, regulationSource("l1")],
  };
}

export function buildHalfDayAnswer(): ChatAnswer {
  const regulation = findRegulation("l2");
  return {
    kind: "half_day_policy",
    answer: regulation.content,
    asOf: regulation.updatedAt,
    sources: [regulationSource("l2")],
  };
}

export function buildUnsupportedAnswer(today: string): ChatAnswer {
  return {
    kind: "unsupported",
    answer:
      "지금은 휴가 잔여일수, 법정 연차 기준, 반차/반반차 규정 질문에만 답할 수 있습니다. 그 외 문의는 HR에 문의해 주세요.",
    asOf: today,
    sources: [],
  };
}
