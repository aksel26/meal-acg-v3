import type { NextRequest } from "next/server";

import { decodeSignedCookie, encodeSignedCookie } from "./session-cookie";

export const WORKER_SESSION_COOKIE_NAME = "supervisor-worker-session";
// 계약서 열람 + 주민번호 입력 + 서명 + 필수 다운로드가 10분을 넘겨 만료되면
// 재인증 단계가 없어 제출이 401로 막히므로, 실제 서명 소요를 커버하도록 상향.
const WORKER_SESSION_MAX_AGE_SECONDS = 30 * 60;

export type WorkerSession = {
  jobPostingId: string;
  workerId: string;
  assignmentId: string;
};

export async function buildWorkerSessionCookie(session: WorkerSession) {
  return {
    name: WORKER_SESSION_COOKIE_NAME,
    value: await encodeSignedCookie(session, WORKER_SESSION_MAX_AGE_SECONDS),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: WORKER_SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

export function buildWorkerSessionLogoutCookie() {
  return {
    name: WORKER_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 0,
    path: "/",
  };
}

export async function getWorkerSession(
  request: NextRequest,
  expectedJobPostingId: string,
): Promise<WorkerSession | null> {
  const value = request.cookies.get(WORKER_SESSION_COOKIE_NAME)?.value;
  if (!value) return null;

  const decoded = await decodeSignedCookie(value);
  if (
    !decoded ||
    decoded.jobPostingId !== expectedJobPostingId ||
    typeof decoded.workerId !== "string" ||
    typeof decoded.assignmentId !== "string"
  ) {
    return null;
  }

  return {
    jobPostingId: expectedJobPostingId,
    workerId: decoded.workerId,
    assignmentId: decoded.assignmentId,
  };
}
