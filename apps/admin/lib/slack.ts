import { WebClient } from "@slack/web-api";

// Slack 클라이언트 싱글톤
let slackClient: WebClient | null = null;

export function getSlackClient(): WebClient {
  if (!slackClient) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error("SLACK_BOT_TOKEN is not configured");
    }
    slackClient = new WebClient(token);
  }
  return slackClient;
}

// 이메일로 Slack 유저 ID 찾기
export async function findSlackUserByEmail(email: string): Promise<string | null> {
  try {
    const client = getSlackClient();
    const result = await client.users.lookupByEmail({ email });
    return result.user?.id || null;
  } catch (error) {
    // users_not_found 에러는 해당 이메일로 등록된 유저가 없는 경우
    if ((error as { data?: { error?: string } })?.data?.error === "users_not_found") {
      return null;
    }
    throw error;
  }
}

// 정산 메시지 데이터 인터페이스
export interface SettlementMessageData {
  fullName: string;
  year: number;
  month: number;
  totalAllowance: number;
  totalUsed: number;
  balance: number;
}

// 숫자 포맷 헬퍼
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

// 정산 메시지 포맷
export function formatSettlementMessage(data: SettlementMessageData): string {
  const { fullName, year, month, totalAllowance, totalUsed, balance } = data;

  const balanceText = balance >= 0
    ? `:white_check_mark: *잔액: ${formatCurrency(balance)}원*`
    : `:warning: *초과: ${formatCurrency(Math.abs(balance))}원*`;

  const footerText = balance >= 0
    ? "_잔액은 이월되지 않습니다._"
    : `_초과 금액 ${formatCurrency(Math.abs(balance))}원은 급여에서 공제될 예정입니다._`;

  return `*${year}년 ${month}월 식대 정산 안내* :fork_and_knife:

안녕하세요, *${fullName}*님!

이번 달 식대 정산 내역을 알려드립니다.

:calendar: *정산 기간:* ${year}년 ${month}월
:moneybag: *지원금:* ${formatCurrency(totalAllowance)}원
:credit_card: *사용액:* ${formatCurrency(totalUsed)}원
${balanceText}

${footerText}`;
}

// DM 발송 결과 인터페이스
export interface SendDMResult {
  success: boolean;
  error?: string;
  ts?: string; // 발송된 메시지 타임스탬프
}

// DM 발송
export async function sendSlackDM(
  slackUserId: string,
  message: string
): Promise<SendDMResult> {
  try {
    const client = getSlackClient();

    // DM 채널 열기
    const conversationResult = await client.conversations.open({
      users: slackUserId,
    });

    if (!conversationResult.channel?.id) {
      return {
        success: false,
        error: "DM 채널을 열 수 없습니다",
      };
    }

    // 메시지 발송
    const messageResult = await client.chat.postMessage({
      channel: conversationResult.channel.id,
      text: message,
      mrkdwn: true,
    });

    return {
      success: true,
      ts: messageResult.ts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
