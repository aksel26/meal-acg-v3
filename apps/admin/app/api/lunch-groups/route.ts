import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  const { searchParams } = new URL(request.url);
  const weekStartDate = searchParams.get("weekStartDate");

  if (!weekStartDate) {
    return NextResponse.json(
      { error: "weekStartDate is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("lunch_groups")
    .delete()
    .eq("week_start_date", weekStartDate);

  if (error) {
    console.error("Error deleting lunch groups:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// POST: 점심조 생성/저장
export async function POST(request: Request) {
  const body = await request.json();
  const { weekStartDate, groups } = body as {
    weekStartDate: string;
    groups: { groupNumber: number; memberIds: string[]; maxSlots: number }[];
  };

  if (!weekStartDate || !groups) {
    return NextResponse.json(
      { error: "weekStartDate and groups are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // 트랜잭션: 기존 데이터 삭제 후 새로 생성
  // 1. 해당 주차의 기존 그룹 삭제 (CASCADE로 멤버도 함께 삭제됨)
  const { error: deleteError } = await supabase
    .from("lunch_groups")
    .delete()
    .eq("week_start_date", weekStartDate);

  if (deleteError) {
    console.error("Error deleting existing groups:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // 2. 새 그룹 생성
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

  // 3. 멤버 배정
  const memberInserts: { group_id: string; user_id: string }[] = [];
  groups.forEach((g) => {
    const group = newGroups.find((ng) => ng.group_number === g.groupNumber);
    if (group) {
      g.memberIds.forEach((userId) => {
        memberInserts.push({
          group_id: group.id,
          user_id: userId,
        });
      });
    }
  });

  if (memberInserts.length > 0) {
    const { error: memberError } = await supabase
      .from("lunch_group_members")
      .insert(memberInserts);

    if (memberError) {
      console.error("Error assigning members:", memberError);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, groups: newGroups });
}
