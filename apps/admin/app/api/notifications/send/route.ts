import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { sendPushNotification, type PushPayload } from "@/lib/web-push";

interface SendRequest {
  memberIds?: string[];
  sendToAll?: boolean;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface MemberResult {
  memberId: string;
  fullName: string;
  success: boolean;
  sent: number;
  failed: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const body: SendRequest = await request.json();
    const { memberIds, sendToAll, title, body: messageBody, url, tag } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }

    if (!sendToAll && (!memberIds || memberIds.length === 0)) {
      return NextResponse.json(
        { error: "memberIds or sendToAll is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 구독 조회
    let query = supabase
      .from("push_subscriptions")
      .select("id, member_id, endpoint, p256dh, auth");

    if (!sendToAll && memberIds) {
      query = query.in("member_id", memberIds);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        summary: { total: 0, success: 0, failed: 0, cleaned: 0 },
        results: [],
      });
    }

    // 멤버 이름 조회
    const uniqueMemberIds = [...new Set(subscriptions.map((s) => s.member_id))];
    const { data: members } = await supabase
      .from("members")
      .select("id, full_name")
      .in("id", uniqueMemberIds);

    const memberNameMap = new Map(
      (members || []).map((m) => [m.id, m.full_name])
    );

    const payload: PushPayload = { title, body: messageBody, url, tag };

    // 병렬 발송
    const sendResults = await Promise.all(
      subscriptions.map((sub) =>
        sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        )
      )
    );

    // 만료된 구독 정리 (HTTP 410 Gone)
    const expiredIds = subscriptions
      .filter((_, i) => sendResults[i]!.statusCode === 410)
      .map((sub) => sub.id);

    if (expiredIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredIds);
    }

    // 멤버별 결과 집계
    const memberResultMap = new Map<string, MemberResult>();

    subscriptions.forEach((sub, i) => {
      const result = sendResults[i]!;
      const existing = memberResultMap.get(sub.member_id);

      if (existing) {
        if (result.success) {
          existing.sent++;
        } else {
          existing.failed++;
        }
      } else {
        memberResultMap.set(sub.member_id, {
          memberId: sub.member_id,
          fullName: memberNameMap.get(sub.member_id) || "Unknown",
          success: result.success,
          sent: result.success ? 1 : 0,
          failed: result.success ? 0 : 1,
        });
      }
    });

    // 성공 여부 업데이트 (1건이라도 성공이면 true)
    for (const memberResult of memberResultMap.values()) {
      memberResult.success = memberResult.sent > 0;
    }

    const results = Array.from(memberResultMap.values());
    const successCount = results.filter((r) => r.success).length;

    // 발송 이력 저장
    await supabase.from("push_notification_logs").insert({
      title,
      body: messageBody,
      tag,
      send_to_all: !!sendToAll,
      total_recipients: results.length,
      success_count: successCount,
      failed_count: results.length - successCount,
      cleaned_count: expiredIds.length,
      results: JSON.stringify(results),
      sent_by: session.fullName,
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        success: successCount,
        failed: results.length - successCount,
        cleaned: expiredIds.length,
      },
      results,
    });
  } catch (error) {
    console.error("Push notification send error:", error);
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (error.message === "VAPID keys are not configured") {
        return NextResponse.json(
          { error: "푸시 알림이 설정되지 않았습니다" },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
