// 감독관 앱은 주민등록번호를 화면에 노출하지 않는다. 저장은 resident_id_enc(암호문)로만
// 이뤄지고, 조회 응답에서는 평문/암호문 모두 제거해 접근 권한이 있는 사용자에게도
// 원본 주민번호가 새어 나가지 않게 한다.
const SENSITIVE_WORKER_FIELDS = ["resident_id", "resident_id_enc"] as const;

export function stripWorkerPII<T extends object>(worker: T): T {
  const clone = { ...worker } as Record<string, unknown>;
  for (const field of SENSITIVE_WORKER_FIELDS) {
    delete clone[field];
  }
  return clone as T;
}
