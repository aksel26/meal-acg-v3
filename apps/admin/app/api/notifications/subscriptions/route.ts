import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { applyRoleOverride } from "@/lib/constants";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    // 활성 멤버 목록 (퇴사/휴직 제외)
    const { data: statusMembers } = await supabase
      .from("member_current_status")
      .select("member_id")
      .not("current_status", "is", null);

    const excludeIds = (statusMembers || [])
      .map((m) => m.member_id)
      .filter(Boolean) as string[];

    let membersQuery = supabase
      .from("members")
      .select("id, full_name, member_role, teams(name)")
      .order("full_name");

    if (excludeIds.length > 0) {
      membersQuery = membersQuery.not(
        "id",
        "in",
        `(${excludeIds.join(",")})`
      );
    }

    const { data: members, error: membersError } = await membersQuery;

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    // 전체 push 구독 데이터
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("member_id, user_agent, updated_at");

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    // member_id별 구독 집계
    const subMap = new Map<
      string,
      { devices: ("pc" | "mobile")[]; lastUpdated: string | null }
    >();

    function detectDeviceType(ua: string | null): "pc" | "mobile" {
      if (!ua) return "pc";
      return /Mobile|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "pc";
    }

    for (const sub of subscriptions || []) {
      const deviceType = detectDeviceType(sub.user_agent);
      const existing = subMap.get(sub.member_id);
      if (existing) {
        existing.devices.push(deviceType);
        if (
          sub.updated_at &&
          (!existing.lastUpdated || sub.updated_at > existing.lastUpdated)
        ) {
          existing.lastUpdated = sub.updated_at;
        }
      } else {
        subMap.set(sub.member_id, {
          devices: [deviceType],
          lastUpdated: sub.updated_at,
        });
      }
    }

    const result = (members || []).map(({ teams, ...rest }) => {
      const member = applyRoleOverride({
        ...rest,
        team_name: Array.isArray(teams)
          ? (teams[0] as { name: string } | undefined)?.name ?? null
          : (teams as { name: string } | null)?.name ?? null,
      });
      const sub = subMap.get(member.id);
      return {
        id: member.id,
        full_name: member.full_name,
        member_role: member.member_role,
        team_name: member.team_name,
        subscribed: !!sub,
        deviceCount: sub?.devices.length ?? 0,
        devices: sub?.devices ?? [],
        lastUpdated: sub?.lastUpdated ?? null,
      };
    });

    const totalMembers = result.length;
    const subscribedCount = result.filter((r) => r.subscribed).length;

    return NextResponse.json({
      members: result,
      summary: {
        total: totalMembers,
        subscribed: subscribedCount,
        unsubscribed: totalMembers - subscribedCount,
      },
    });
  } catch (error) {
    console.error("Subscriptions API error:", error);
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const { memberId } = await request.json();
    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("member_id", memberId);

    if (error) {
      console.error("Error deleting subscriptions:", error);
      return NextResponse.json(
        { error: "Failed to delete subscriptions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete subscription error:", error);
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
