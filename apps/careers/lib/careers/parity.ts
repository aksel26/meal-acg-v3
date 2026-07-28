export type OrderedStatus = {
  id: string;
  isDefault?: boolean;
  isCompletion?: boolean;
};

export type StageRecordLike = {
  stageId: string;
  statusId: string;
  meta?: {
    startDate?: string;
    endDate?: string;
    time?: string;
    note?: string;
  };
};

export type OrderedStageLike = {
  id: string;
  name: string;
  order: number;
  showOnCalendar?: boolean;
  statuses: Array<OrderedStatus>;
};

export function derivePostingStatus(
  endDate: string | null | undefined,
  now = new Date(),
) {
  if (!endDate) return "진행중" as const;
  return now.getTime() >
    new Date(`${endDate.slice(0, 10)}T23:59:59+09:00`).getTime()
    ? ("종료" as const)
    : ("진행중" as const);
}

export function syncStatusFlags<T extends OrderedStatus>(statuses: T[]): T[] {
  return statuses.map((status, index) => ({
    ...status,
    isDefault: index === 0,
    isCompletion: index === statuses.length - 1,
  }));
}

export function getStageRecordStatus<
  TStage extends OrderedStageLike,
  TRecord extends StageRecordLike,
>(records: TRecord[], stage: TStage) {
  const record = records.find((candidate) => candidate.stageId === stage.id);
  return (
    stage.statuses.find((status) => status.id === record?.statusId) ??
    stage.statuses.find((status) => status.isDefault) ??
    stage.statuses[0]
  );
}

export function getCurrentStage<
  TStage extends OrderedStageLike,
  TRecord extends StageRecordLike,
>(records: TRecord[], stages: TStage[]) {
  const ordered = [...stages].sort((left, right) => left.order - right.order);
  let current = ordered[0];
  for (const stage of ordered) {
    if (!getStageRecordStatus(records, stage)?.isDefault) current = stage;
  }
  return current;
}

export function resolveSeparatedStage<
  TRecord extends StageRecordLike,
  TStage extends Omit<OrderedStageLike, "order"> & { displayOrder: number },
>(
  snapshotStageId: string | null | undefined,
  stageRecords: TRecord[],
  stages: TStage[],
) {
  const orderedStages = stages.map((stage) => ({
    ...stage,
    order: stage.displayOrder,
  }));
  return (
    orderedStages.find((stage) => stage.id === snapshotStageId) ||
    getCurrentStage(stageRecords, orderedStages)
  );
}

export type ScheduleBucket = "upcoming" | "overdue" | "completed";

export function deriveScheduleBucket(
  record: StageRecordLike,
  hasFinalResult: boolean,
  today: string,
): ScheduleBucket {
  if (hasFinalResult) return "completed";
  return record.meta?.endDate && record.meta.endDate < today
    ? "overdue"
    : "upcoming";
}

export function findScheduleRecord<
  TStage extends OrderedStageLike,
  TRecord extends StageRecordLike,
>(records: TRecord[], stages: TStage[]) {
  let match: { record: TRecord; stage: TStage } | undefined;
  for (const stage of [...stages].sort(
    (left, right) => left.order - right.order,
  )) {
    if (!stage.showOnCalendar) continue;
    const record = records.find(
      (candidate) =>
        candidate.stageId === stage.id && Boolean(candidate.meta?.time),
    );
    if (record) match = { record, stage };
  }
  return match;
}

export function renderMessageTemplate(
  template: string,
  variables: Record<string, string | null | undefined>,
) {
  const values: Record<string, string | null | undefined> = {
    회사명: "ACG",
    ...variables,
  };
  return template.replace(
    /\{\{(.+?)\}\}/g,
    (token, name: string) => values[name.trim()] ?? token,
  );
}

export type TransitionMessageIntent = "auto" | "manual" | "preserve";

export function hasStageStatusChanged(
  existingStatusId: string | null | undefined,
  targetStatusId: string,
) {
  return !existingStatusId || existingStatusId !== targetStatusId;
}

export function resolveTransitionMessageAction(input: {
  intent: TransitionMessageIntent;
  statusChanged: boolean;
  hasSendPayload: boolean;
}) {
  if (input.intent === "manual")
    return input.hasSendPayload ? ("manual" as const) : ("invalid" as const);
  if (input.intent === "auto" && input.statusChanged) return "auto" as const;
  return "preserve" as const;
}
