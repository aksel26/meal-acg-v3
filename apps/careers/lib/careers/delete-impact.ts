type DeleteImpactRequest = {
  targetId: string;
  requestSequence: number;
};

export type DeleteImpactState =
  | { status: "idle" }
  | ({ status: "loading" } & DeleteImpactRequest)
  | ({ status: "loaded"; count: number } & DeleteImpactRequest)
  | ({ status: "error"; message: string } & DeleteImpactRequest);

export function beginDeleteImpact(
  targetId: string,
  requestSequence: number,
): DeleteImpactState {
  return { status: "loading", targetId, requestSequence };
}

function isCurrentRequest(
  state: DeleteImpactState,
  targetId: string,
  requestSequence: number,
) {
  return (
    state.status === "loading" &&
    state.targetId === targetId &&
    state.requestSequence === requestSequence
  );
}

export function resolveDeleteImpact(
  state: DeleteImpactState,
  targetId: string,
  requestSequence: number,
  count: number,
): DeleteImpactState {
  if (!isCurrentRequest(state, targetId, requestSequence)) return state;
  return { status: "loaded", targetId, requestSequence, count };
}

export function rejectDeleteImpact(
  state: DeleteImpactState,
  targetId: string,
  requestSequence: number,
  message: string,
): DeleteImpactState {
  if (!isCurrentRequest(state, targetId, requestSequence)) return state;
  return { status: "error", targetId, requestSequence, message };
}

export function canConfirmDeleteImpact(
  state: DeleteImpactState,
  targetId: string,
) {
  return state.status === "loaded" && state.targetId === targetId;
}

export function parseAffectedApplications(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error("영향받는 지원자 수 응답이 올바르지 않습니다.");
  }
  return value;
}
