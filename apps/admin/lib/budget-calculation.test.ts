import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateActivityBudgets,
  type ActivityBudgetMember,
} from "./budget-calculation";

const members: ActivityBudgetMember[] = [
  {
    id: "representative",
    full_name: "대표",
    member_role: "대표",
    organization_id: "org-a",
    team_id: null,
    team_name: null,
    intern_months: null,
  },
  {
    id: "leader",
    full_name: "팀장",
    member_role: "팀장",
    organization_id: "org-a",
    team_id: "team-a",
    team_name: "A팀",
    intern_months: null,
  },
  {
    id: "member",
    full_name: "팀원",
    member_role: "팀원",
    organization_id: "org-a",
    team_id: "team-a",
    team_name: "A팀",
    intern_months: null,
  },
  {
    id: "intern",
    full_name: "인턴",
    member_role: "인턴",
    organization_id: "org-a",
    team_id: "team-a",
    team_name: "A팀",
    intern_months: 3,
  },
];

test("대표는 활동비 수령 대상에서 제외하고 인턴은 개월 수만큼 팀장 금액에 합산한다", () => {
  const calculations = calculateActivityBudgets(members, new Set());

  assert.deepEqual(
    calculations.map((calculation) => calculation.id),
    ["leader"],
  );
  assert.equal(calculations[0]?.amount, 375_000);
});

test("특이사항 인턴은 활동비 계산에서 제외한다", () => {
  const calculations = calculateActivityBudgets(members, new Set(["intern"]));

  assert.equal(calculations[0]?.amount, 300_000);
});

test("정진우와 특이사항 팀원은 팀 인원 계산에서도 제외한다", () => {
  const calculations = calculateActivityBudgets(
    [
      ...members,
      {
        id: "name-override",
        full_name: "정진우",
        member_role: "팀원",
        organization_id: "org-a",
        team_id: "team-a",
        team_name: "A팀",
        intern_months: null,
      },
    ],
    new Set(["member"]),
  );

  assert.equal(calculations[0]?.amount, 225_000);
});

test("P&C 추가 활동비는 같은 조직의 다른 팀 팀원과 인턴만 포함한다", () => {
  const calculations = calculateActivityBudgets(
    [
      {
        id: "pnc-leader",
        full_name: "P&C 팀장",
        member_role: "팀장",
        organization_id: "org-a",
        team_id: "pnc-a",
        team_name: "People & Culture",
        intern_months: null,
      },
      {
        id: "external-member",
        full_name: "외부 팀원",
        member_role: "팀원",
        organization_id: "org-a",
        team_id: "team-a",
        team_name: "A팀",
        intern_months: null,
      },
      {
        id: "external-intern",
        full_name: "외부 인턴",
        member_role: "인턴",
        organization_id: "org-a",
        team_id: "team-a",
        team_name: "A팀",
        intern_months: 3,
      },
      {
        id: "other-org-member",
        full_name: "다른 조직 팀원",
        member_role: "팀원",
        organization_id: "org-b",
        team_id: "team-b",
        team_name: "B팀",
        intern_months: null,
      },
    ],
    new Set(),
  );

  assert.equal(calculations[0]?.amount, 225_000);
  assert.equal(calculations[0]?.pncExtraCount, 2);
});
