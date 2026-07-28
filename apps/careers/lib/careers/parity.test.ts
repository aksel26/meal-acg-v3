import assert from "node:assert/strict";

const parityPath = "./parity.ts";
const {
  derivePostingStatus,
  deriveScheduleBucket,
  getCurrentStage,
  hasStageStatusChanged,
  resolveSeparatedStage,
  resolveTransitionMessageAction,
  renderMessageTemplate,
  syncStatusFlags,
} = await import(parityPath);

const statuses: Array<{
  id: string;
  isDefault: boolean;
  isCompletion: boolean;
}> = syncStatusFlags([{ id: "wait" }, { id: "working" }, { id: "done" }]);
assert.deepEqual(
  statuses.map(({ isDefault, isCompletion }) => ({
    isDefault,
    isCompletion,
  })),
  [
    { isDefault: true, isCompletion: false },
    { isDefault: false, isCompletion: false },
    { isDefault: false, isCompletion: true },
  ],
);
assert.equal(
  derivePostingStatus("2026-07-28", new Date("2026-07-28T12:00:00")),
  "진행중",
);
assert.equal(
  derivePostingStatus("2026-07-27", new Date("2026-07-28T12:00:00")),
  "종료",
);
assert.equal(
  getCurrentStage(
    [
      { stageId: "first", statusId: "done" },
      { stageId: "second", statusId: "wait" },
    ],
    [
      { id: "first", name: "1", order: 1, statuses },
      { id: "second", name: "2", order: 2, statuses },
    ],
  )?.id,
  "first",
);
const separationStages = [
  {
    id: "documents",
    name: "서류 검토 (개편)",
    displayOrder: 1,
    statuses: [
      {
        id: "documents-wait",
        name: "대기",
        color: "gray",
        isDefault: true,
        isCompletion: false,
        hasDateInput: false,
        resultMeaning: "neutral",
        isTerminal: false,
        isActive: true,
        displayOrder: 1,
        messageRule: null,
      },
      {
        id: "documents-done",
        name: "완료",
        color: "green",
        isDefault: false,
        isCompletion: true,
        hasDateInput: false,
        resultMeaning: "neutral",
        isTerminal: true,
        isActive: true,
        displayOrder: 2,
        messageRule: null,
      },
    ],
    type: "",
    showOnCalendar: false,
    isActive: true,
    autoSend: { enabled: false, channels: [], title: "", body: "" },
  },
  {
    id: "interview",
    name: "면접",
    displayOrder: 2,
    statuses: [
      {
        id: "interview-wait",
        name: "대기",
        color: "gray",
        isDefault: true,
        isCompletion: false,
        hasDateInput: true,
        resultMeaning: "neutral",
        isTerminal: false,
        isActive: true,
        displayOrder: 1,
        messageRule: null,
      },
      {
        id: "interview-active",
        name: "진행",
        color: "blue",
        isDefault: false,
        isCompletion: false,
        hasDateInput: true,
        resultMeaning: "neutral",
        isTerminal: false,
        isActive: true,
        displayOrder: 2,
        messageRule: null,
      },
    ],
    type: "",
    showOnCalendar: true,
    isActive: true,
    autoSend: { enabled: false, channels: [], title: "", body: "" },
  },
];
const separationRecords = [
  {
    stageId: "documents",
    statusId: "documents-done",
    updatedAt: "2026-07-28T09:00:00.000Z",
  },
  {
    stageId: "interview",
    statusId: "interview-active",
    updatedAt: "2026-07-28T10:00:00.000Z",
  },
];
assert.equal(
  resolveSeparatedStage("documents", separationRecords, separationStages)?.name,
  "서류 검토 (개편)",
);
assert.equal(
  resolveSeparatedStage("deleted-stage", separationRecords, separationStages)
    ?.id,
  "interview",
);
assert.equal(
  resolveSeparatedStage(null, separationRecords, separationStages)?.id,
  "interview",
);
assert.equal(
  deriveScheduleBucket(
    {
      stageId: "interview",
      statusId: "scheduled",
      meta: { endDate: "2026-07-27", time: "10:00" },
    },
    false,
    "2026-07-28",
  ),
  "overdue",
);
assert.equal(
  renderMessageTemplate("{{회사명}} {{지원자명}} {{미정}}", {
    지원자명: "김관리",
  }),
  "ACG 김관리 {{미정}}",
);
assert.equal(hasStageStatusChanged(null, "scheduled"), true);
assert.equal(hasStageStatusChanged("waiting", "scheduled"), true);
assert.equal(hasStageStatusChanged("scheduled", "scheduled"), false);
assert.equal(
  resolveTransitionMessageAction({
    intent: "auto",
    statusChanged: true,
    hasSendPayload: true,
  }),
  "auto",
);
assert.equal(
  resolveTransitionMessageAction({
    intent: "auto",
    statusChanged: false,
    hasSendPayload: true,
  }),
  "preserve",
);
assert.equal(
  resolveTransitionMessageAction({
    intent: "preserve",
    statusChanged: false,
    hasSendPayload: true,
  }),
  "preserve",
);
assert.equal(
  resolveTransitionMessageAction({
    intent: "manual",
    statusChanged: false,
    hasSendPayload: true,
  }),
  "manual",
);
assert.equal(
  resolveTransitionMessageAction({
    intent: "manual",
    statusChanged: false,
    hasSendPayload: false,
  }),
  "invalid",
);
