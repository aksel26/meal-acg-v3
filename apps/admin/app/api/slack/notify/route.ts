import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  findSlackUserByEmail,
  formatSettlementMessage,
  sendSlackDM,
  SettlementMessageData,
} from "@/lib/slack";
import type { Database } from "@/lib/supabase/types";

type MonthlyStat =
  Database["public"]["Functions"]["get_user_monthly_stats"]["Returns"][number];

interface NotifyRequest {
  userIds: string[];
  year: number;
  month: number;
}

interface NotifyResult {
  userId: string;
  fullName: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body: NotifyRequest = await request.json();
    const { userIds, year, month } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds is required" },
        { status: 400 },
      );
    }

    if (!year || !month) {
      return NextResponse.json(
        { error: "year and month are required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // 멤버 정보와 정산 데이터를 병렬로 조회
    const [membersResult, statsResult] = await Promise.all([
      supabase.from("members").select("id, full_name, email").in("id", userIds),
      supabase.rpc("get_user_monthly_stats", { p_year: year, p_month: month }),
    ]);

    const { data: members, error: membersError } = membersResult;
    const { data: statsData, error: statsError } = statsResult;

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 },
      );
    }

    if (statsError) {
      console.error("Error fetching stats:", statsError);
      return NextResponse.json(
        { error: "Failed to fetch stats" },
        { status: 500 },
      );
    }

    const statsMap = new Map<
      string,
      {
        totalAllowance: number;
        totalUsed: number;
        balance: number;
      }
    >();
    ((statsData || []) as MonthlyStat[]).forEach((stat) => {
      statsMap.set(stat.user_id, {
        totalAllowance: stat.total_allowance,
        totalUsed: stat.total_used,
        balance: stat.balance,
      });
    });

    const results: NotifyResult[] = [];

    // 각 멤버별로 Slack DM 발송
    for (const member of members || []) {
      const result: NotifyResult = {
        userId: member.id,
        fullName: member.full_name,
        success: false,
      };

      // 이메일 확인
      if (!member.email) {
        result.error = "이메일이 등록되지 않았습니다";
        results.push(result);
        continue;
      }

      // Slack 유저 ID 조회
      let slackUserId: string | null;
      try {
        slackUserId = await findSlackUserByEmail(member.email);
      } catch (error) {
        console.error(`Error finding Slack user for ${member.email}:`, error);
        result.error = "Slack 연결 오류가 발생했습니다";
        results.push(result);
        continue;
      }

      if (!slackUserId) {
        result.error = "Slack 사용자를 찾을 수 없습니다";
        results.push(result);
        continue;
      }

      // 정산 데이터 확인
      const stats = statsMap.get(member.id);
      if (!stats) {
        result.error = "정산 데이터를 찾을 수 없습니다";
        results.push(result);
        continue;
      }

      // 메시지 생성
      const messageData: SettlementMessageData = {
        fullName: member.full_name,
        year,
        month,
        totalAllowance: stats.totalAllowance,
        totalUsed: stats.totalUsed,
        balance: stats.balance,
      };
      const message = formatSettlementMessage(messageData);

      // DM 발송
      const sendResult = await sendSlackDM(slackUserId, message);
      if (sendResult.success) {
        result.success = true;
      } else {
        result.error = sendResult.error || "메시지 발송 실패";
      }

      results.push(result);
    }

    // 결과 집계
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        success: successCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error("Slack notify API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof Error &&
      error.message === "SLACK_BOT_TOKEN is not configured"
    ) {
      return NextResponse.json(
        { error: "Slack이 설정되지 않았습니다" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
