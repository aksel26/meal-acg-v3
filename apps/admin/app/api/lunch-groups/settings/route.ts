import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";

// GET: 설정 조회
export async function GET() {
  try {
    await requireAdminPermission("organization:read");
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
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: authStatus },
      );
    }
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "점심조 설정 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// PUT: 설정 업데이트
export async function PUT(request: Request) {
  try {
    await requireAdminPermission("organization:write");
    const body = await request.json();
    const { maxMembersPerGroup, totalGroups } = body;

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
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: authStatus },
      );
    }
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "점심조 설정 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
