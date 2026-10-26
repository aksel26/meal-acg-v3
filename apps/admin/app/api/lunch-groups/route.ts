import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { authErrorResponse, logLunchGroupAction } from "@/lib/lunch-group-audit";
import type { LunchGroupWithMembers } from "@/lib/supabase/types";

// GET: 특정 주차의 점심조 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStartDate = searchParams.get("weekStartDate");

  if (!weekStartDate) {
    return NextResponse.json(
      { error: "weekStartDate is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // 해당 주차의 점심조와 멤버 조회
  const { data: groups, error } = await supabase
    .from("lunch_groups")
    .select(`
      *,
      members:lunch_group_members(
        *,
        member:members(*)
      )
    `)
    .eq("week_start_date", weekStartDate)
    .order("group_number");

  if (error) {
    console.error("Error fetching lunch groups:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(groups as LunchGroupWithMembers[]);
}

// DELETE: 해당 주차의 점심조 전체 삭제
export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const weekStartDate = searchParams.get("weekStartDate");

    if (!weekStartDate) {
      return NextResponse.json(
        { error: "weekStartDate is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("lunch_groups")
      .delete()
      .eq("week_start_date", weekStartDate);

    if (error) {
      console.error("Error deleting lunch groups:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logLunchGroupAction({
      weekStartDate,
      action: "reset",
      changedBy: session.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Lunch groups API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: 조 테이블 생성 (조만 만든다. 배정은 뽑기 RPC와 멤버 이동 API가 한 명씩 처리)
// 이미 조가 있으면 409. 다시 만들려면 DELETE 후 POST.
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { weekStartDate, groups } = body as {
      weekStartDate: string;
      groups: { groupNumber: number; maxSlots: number }[];
    };

    if (!weekStartDate || !groups?.length) {
      return NextResponse.json(
        { error: "weekStartDate and groups are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { count, error: countError } = await supabase
      .from("lunch_groups")
      .select("id", { count: "exact", head: true })
      .eq("week_start_date", weekStartDate);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "이미 조 테이블이 있습니다. 초기화한 뒤 다시 생성하세요." },
        { status: 409 }
      );
    }

    const groupInserts = groups.map((g) => ({
      group_number: g.groupNumber,
      week_start_date: weekStartDate,
      max_slots: g.maxSlots,
    }));

    const { data: newGroups, error: groupError } = await supabase
      .from("lunch_groups")
      .insert(groupInserts)
      .select();

    if (groupError || !newGroups) {
      console.error("Error creating groups:", groupError);
      return NextResponse.json(
        { error: groupError?.message || "Failed to create groups" },
        { status: 500 }
      );
    }

    await logLunchGroupAction({
      weekStartDate,
      action: "create_table",
      changedBy: session.userId,
      detail: { groups: groups.map((g) => [g.groupNumber, g.maxSlots]) },
    });

    return NextResponse.json({ success: true, groups: newGroups });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Lunch groups API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
