import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: 설정 조회
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lunch_group_settings")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT: 설정 업데이트
export async function PUT(request: Request) {
  const body = await request.json();
  const { maxMembersPerGroup, minMembersPerGroup, totalGroups } = body;

  // 최소가 최대를 넘으면 잘못된 배정이 저장되므로 입력 단계에서 막는다
  if (
    typeof maxMembersPerGroup !== "number" ||
    typeof minMembersPerGroup !== "number" ||
    !Number.isInteger(maxMembersPerGroup) ||
    !Number.isInteger(minMembersPerGroup) ||
    minMembersPerGroup < 1 ||
    maxMembersPerGroup < minMembersPerGroup
  ) {
    return NextResponse.json(
      { error: "조당 인원은 1명 이상이어야 하고, 최대는 최소보다 작을 수 없습니다." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // 첫 번째 설정 레코드 업데이트
  const { data: existing } = await supabase
    .from("lunch_group_settings")
    .select("id")
    .limit(1)
    .single();

  if (!existing) {
    // 없으면 생성
    const { data, error } = await supabase
      .from("lunch_group_settings")
      .insert({
        max_members_per_group: maxMembersPerGroup,
        min_members_per_group: minMembersPerGroup,
        total_groups: totalGroups,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("lunch_group_settings")
    .update({
      max_members_per_group: maxMembersPerGroup,
      min_members_per_group: minMembersPerGroup,
      total_groups: totalGroups,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
