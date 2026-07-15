import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// POST /api/meal-logs/bulk - Bulk create meal logs
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      excludedUserIds = [],
      entryDate,
      attendance,
      lunchAmount,
      lunchStore,
      lunchPayer,
    } = body;

    if (!entryDate) {
      return NextResponse.json(
        { error: "entryDate is required" },
        { status: 400 }
      );
    }

    // 모든 멤버 조회
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id");

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    // 특이사항(휴직/퇴사 등) 있는 멤버 조회 — 제외 선택 UI(exclude_status=true)와 동일 기준
    const { data: statusMembers, error: statusError } = await supabase
      .from("member_current_status")
      .select("member_id")
      .not("current_status", "is", null);

    if (statusError) {
      console.error("Error fetching member statuses:", statusError);
      return NextResponse.json(
        { error: "Failed to fetch member statuses" },
        { status: 500 }
      );
    }

    const statusMemberIds = new Set(
      (statusMembers || []).map((m) => m.member_id).filter(Boolean)
    );

    // 특이사항 멤버 + 제외 선택된 멤버를 뺀 대상 멤버 필터링
    const targetMembers = members.filter(
      (member) =>
        !statusMemberIds.has(member.id) && !excludedUserIds.includes(member.id)
    );

    if (targetMembers.length === 0) {
      return NextResponse.json(
        { error: "No members to create meal logs for" },
        { status: 400 }
      );
    }

    // 일괄 upsert 데이터 생성
    const mealLogsData = targetMembers.map((member) => ({
      user_id: member.id,
      entry_date: entryDate,
      attendance: attendance || null,
      breakfast_store: null,
      breakfast_amount: 0,
      breakfast_payer: null,
      lunch_store: lunchStore || null,
      lunch_amount: lunchAmount || 0,
      lunch_payer: lunchPayer || null,
      dinner_store: null,
      dinner_amount: 0,
      dinner_payer: null,
    }));

    const { data, error } = await supabase
      .from("meal_logs")
      .upsert(mealLogsData, { onConflict: "user_id,entry_date" })
      .select();

    if (error) {
      console.error("Error creating bulk meal logs:", error);
      return NextResponse.json(
        { error: "Failed to create bulk meal logs" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, count: data.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("Bulk meal logs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
