import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import {
  createServiceClient,
  createSupervisorServiceClient,
} from "@/lib/supabase/client";
import { consumeRateLimit } from "utils/auth-rate-limit";
import { getToday } from "utils";
import { withContext } from "@repo/logger";
import { fetchLeaveBalances } from "@/lib/leave-balance-query";
import { summarizeLeaveBalances } from "@/lib/leave-balance";
import {
  classifyMessage,
  buildLeaveBalanceAnswer,
  buildStatutoryAnnualAnswer,
  buildHalfDayAnswer,
  buildUnsupportedAnswer,
  type ChatAnswer,
} from "@/lib/chat/answers";

const MAX_MESSAGE_LENGTH = 300;

// POST /api/chat { message } — 읽기 전용 챗봇. 개인 데이터는 세션 사용자로만 조회,
// 질문/답변 원문은 로그에 남기지 않는다 (HANDOFF 8.8).
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = withContext({ route: "chat", requestId });
  const startedAt = Date.now();

  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "잘못된 요청입니다." },
        { status: 400 },
      );
    }
    const message = (body as { message?: unknown })?.message;
    if (
      typeof message !== "string" ||
      message.trim().length === 0 ||
      message.length > MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json(
        {
          error: `질문은 1자 이상 ${MAX_MESSAGE_LENGTH}자 이하로 입력해 주세요.`,
        },
        { status: 400 },
      );
    }

    // 로그인 rate limit과 동일한 fail-open 정책: 클라이언트/RPC 불가 시 차단하지 않음
    const rateLimitClient = createSupervisorServiceClient();
    if (rateLimitClient) {
      const allowed = await consumeRateLimit(
        rateLimitClient,
        request,
        "user-chat",
        {
          limit: 10,
          windowSeconds: 60,
          subject: sessionUser.id,
        },
      );
      if (!allowed) {
        return NextResponse.json(
          { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
          { status: 429 },
        );
      }
    }

    const kind = classifyMessage(message);
    const today = getToday();
    let payload: ChatAnswer;

    if (kind === "leave_balance") {
      const supabase = createServiceClient();
      if (!supabase) {
        return NextResponse.json(
          { error: "데이터베이스 연결 오류" },
          { status: 500 },
        );
      }
      const year = Number(today.slice(0, 4));
      // 조회 대상은 세션 사용자로 강제 — 요청 body의 어떤 값도 사용하지 않는다
      const { data, error } = await fetchLeaveBalances(
        supabase,
        sessionUser.id,
        year,
      );
      if (error) {
        log.error({ err: error }, "leave_balances 조회 실패");
        return NextResponse.json(
          { error: "휴가 데이터 조회에 실패했습니다." },
          { status: 500 },
        );
      }
      payload = buildLeaveBalanceAnswer(
        summarizeLeaveBalances(data ?? []),
        year,
        today,
      );
    } else if (kind === "statutory_annual") {
      payload = buildStatutoryAnnualAnswer();
    } else if (kind === "half_day_policy") {
      payload = buildHalfDayAnswer();
    } else {
      payload = buildUnsupportedAnswer(today);
    }

    log.info(
      { kind, latencyMs: Date.now() - startedAt, status: 200 },
      "chat 응답",
    );
    return NextResponse.json({ ...payload, requestId });
  } catch (error) {
    log.error(
      { err: error, latencyMs: Date.now() - startedAt },
      "chat 처리 오류",
    );
    return NextResponse.json(
      { error: "요청 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
