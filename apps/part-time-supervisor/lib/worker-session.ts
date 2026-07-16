import type { NextRequest } from "next/server";

import { decodeSignedCookie, encodeSignedCookie } from "./session-cookie";

export const WORKER_SESSION_COOKIE_NAME = "supervisor-worker-session";
const WORKER_SESSION_MAX_AGE_SECONDS = 10 * 60;

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
