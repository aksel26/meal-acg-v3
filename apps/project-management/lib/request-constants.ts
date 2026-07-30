// 클라이언트 컴포넌트에서도 안전하게 import 할 수 있는 요청 상수/타입.
// `lib/requests.ts`는 서버 전용(next/headers 체인)이므로 클라이언트에서 값을
// 가져오면 번들에 서버 코드가 딸려온다. 상수가 필요하면 이 파일을 쓸 것.

export const REQUEST_STATUSES = ["접수", "진행", "대기", "완료", "거절"] as const;
export const REQUEST_PRIORITIES = ["P1", "P2", "P3"] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && REQUEST_STATUSES.includes(value as RequestStatus);
}

export function isRequestPriority(value: unknown): value is RequestPriority {
  return typeof value === "string" && REQUEST_PRIORITIES.includes(value as RequestPriority);
}
