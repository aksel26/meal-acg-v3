import pino from "pino";

// 로그에 실려도 노출되면 안 되는 민감 필드 — 어느 깊이에 있든 자동 마스킹.
// (비밀번호/여권번호/연락처/생년월일/인증 헤더·쿠키)
// login_id는 비밀이 아니라 감사에 필요한 식별자이므로 제외한다.
const REDACT_PATHS = [
  "password",
  "currentPassword",
  "newPassword",
  "passport_number",
  "passportNumber",
  "phone",
  "birth_date",
  "birthDate",
  "authorization",
  "cookie",
];

// 중첩 객체(1~2 depth)까지 커버하도록 와일드카드 경로를 함께 등록
const redactPaths = REDACT_PATHS.flatMap((field) => [
  field,
  `*.${field}`,
  `*.*.${field}`,
]);

const isProduction = process.env.NODE_ENV === "production";

/**
 * 공용 로거. stdout에 JSON 한 줄씩 출력 → 컨테이너(k3s) 로그 수집기가 가져간다.
 * 개발 중 보기 좋게 보려면 dev 서버 출력을 pino-pretty로 파이프:
 *   pnpm dev:user | pnpm exec pino-pretty
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  redact: { paths: redactPaths, censor: "[REDACTED]" },
  base: undefined, // pid/hostname 기본 필드 제거 (컨테이너에선 노이즈)
});

/**
 * 요청/사용자 컨텍스트를 고정한 child 로거.
 * 예: const log = withContext({ route: "auth/login", memberId }); log.info("...")
 */
export function withContext(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

export type Logger = typeof logger;
