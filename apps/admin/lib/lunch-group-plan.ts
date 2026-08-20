// 점심조 배정 계산: 인원수 + 조당 최대/최소 인원 → 각 조의 정원
//
// 최대 인원을 지키는 최소 조 개수로 균등 분배하되,
// 최소 인원을 못 채우는 조가 생기면 조 개수를 줄여 최대 초과를 허용한다.
// (5명 / 최대 4 · 최소 3 → 3+2가 아니라 5명 1개 조)

export const DEFAULT_MAX_PER_GROUP = 4;
export const DEFAULT_MIN_PER_GROUP = 3;

export interface LunchGroupPlan {
  /** 각 조의 정원. 큰 조가 앞에 온다. 예: [4, 3, 3] */
  slots: number[];
  totalGroups: number;
  /** 최대 인원을 넘긴 조가 있는지 (최소 인원을 지키느라 초과한 경우) */
  hasOverMax: boolean;
  /** 최소 인원을 못 채운 조가 있는지 (인원 자체가 부족한 경우) */
  hasUnderMin: boolean;
}

/** 인원을 groupCount개 조에 균등 분배 (나머지는 앞 조부터 1명씩) */
function distribute(totalMembers: number, groupCount: number): number[] {
  const base = Math.floor(totalMembers / groupCount);
  const remainder = totalMembers % groupCount;
  return Array.from({ length: groupCount }, (_, i) =>
    i < remainder ? base + 1 : base,
  );
}

export function calculateLunchGroupPlan(
  totalMembers: number,
  maxPerGroup: number,
  minPerGroup: number,
): LunchGroupPlan {
  const max = Math.max(1, Math.floor(maxPerGroup) || DEFAULT_MAX_PER_GROUP);
  const min = Math.min(
    max,
    Math.max(1, Math.floor(minPerGroup) || DEFAULT_MIN_PER_GROUP),
  );

  if (totalMembers <= 0) {
    return { slots: [], totalGroups: 0, hasOverMax: false, hasUnderMin: false };
  }

  // 최대 인원을 지키는 최소 조 개수에서 시작해, 최소 미달 조가 사라질 때까지 조를 줄인다
  let groupCount = Math.ceil(totalMembers / max);
  let slots = distribute(totalMembers, groupCount);

  while (groupCount > 1 && slots.some((s) => s < min)) {
    groupCount -= 1;
    slots = distribute(totalMembers, groupCount);
  }

  return {
    slots,
    totalGroups: groupCount,
    hasOverMax: slots.some((s) => s > max),
    hasUnderMin: slots.some((s) => s < min),
  };
}
