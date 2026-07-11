import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import { sendPushNotification, type PushPayload } from "@/lib/web-push";

interface SendRequest {
  memberIds?: string[];
  names?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    // TODO: 방송 권한(관리자) 검증 필요 — 최소 인증만 적용
    const senderId = sessionUser.id;

    const body: SendRequest = await request.json();
    const { memberIds, names, title, body: messageBody, url, tag } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }

    if ((!memberIds || memberIds.length === 0) && (!names || names.length === 0)) {
      return NextResponse.json(
        { error: "memberIds or names is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // senderId 검증
    const { data: sender, error: senderError } = await supabase
      .from("members")
      .select("id")
      .eq("id", senderId)
      .single();

    if (senderError || !sender) {
      return NextResponse.json(
        { error: "Invalid senderId" },
        { status: 401 }
      );
    }

    // names → memberIds 변환 (names가 제공된 경우)
    let resolvedMemberIds = memberIds || [];
    if ((!memberIds || memberIds.length === 0) && names && names.length > 0) {
      const { data: members } = await supabase
        .from("members")
        .select("id")
        .in("full_name", names);

      resolvedMemberIds = (members || []).map((m) => m.id);
    }

    if (resolvedMemberIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0, total: 0, results: [] });
    }

    // memberIds로 push_subscriptions 조회
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, member_id, endpoint, p256dh, auth")
      .in("member_id", resolvedMemberIds);

    if (subError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        total: resolvedMemberIds.length,
        results: resolvedMemberIds.map((id) => ({
          memberId: id,
          sent: false,
          reason: "no_subscription",
        })),
      });
    }

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

    // 410 Gone 구독 자동 정리
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
    const memberResultMap = new Map<string, { sent: number; failed: number; errors: string[] }>();
    for (const memberId of resolvedMemberIds) {
      memberResultMap.set(memberId, { sent: 0, failed: 0, errors: [] });
    }

    subscriptions.forEach((sub, i) => {
      const result = sendResults[i]!;
      const entry = memberResultMap.get(sub.member_id);
      if (entry) {
        if (result.success) {
          entry.sent++;
        } else {
          entry.failed++;
          if (result.error) entry.errors.push(result.error);
          if (result.statusCode) entry.errors.push(`status: ${result.statusCode}`);
        }
      }
    });

    const results = resolvedMemberIds.map((id) => {
      const entry = memberResultMap.get(id);
      if (!entry || (entry.sent === 0 && entry.failed === 0)) {
        return { memberId: id, sent: false, reason: "no_subscription" as const };
      }
      return {
        memberId: id,
        sent: entry.sent > 0,
        deliveredCount: entry.sent,
        failedCount: entry.failed,
        ...(entry.errors.length > 0 && { errors: entry.errors }),
      };
    });

    const sentCount = results.filter((r) => r.sent).length;

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: resolvedMemberIds.length,
      results,
    });
  } catch (error) {
    console.error("Push notification send error:", error);
    if (error instanceof Error && error.message === "VAPID keys are not configured") {
      return NextResponse.json(
        { error: "Push notifications not configured" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
