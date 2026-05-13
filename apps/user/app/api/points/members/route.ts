import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET: 멤버 목록 조회 (member_id가 있으면 같은 조직만, 없으면 전체)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("member_id");

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB not configured" },
        { status: 500 }
      );
    }

    let organizationId: string | null = null;

    if (memberId) {
      // 요청한 멤버의 organization_id 조회
      const { data: currentMember, error: memberError } = await supabase
        .from("members")
        .select("id, organization_id")
        .eq("id", memberId)
        .single();

      if (memberError || !currentMember) {
        return NextResponse.json(
          { error: "멤버 정보를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      if (!currentMember.organization_id) {
        return NextResponse.json(
          { error: "멤버의 조직 정보가 없습니다." },
          { status: 400 }
        );
      }

      organizationId = currentMember.organization_id;
    }

    // 멤버 조회 (member_id가 있으면 같은 조직만, 없으면 전체)
    let query = supabase
      .from("members")
      .select(
        `
        id,
        full_name,
        member_role,
        team_id,
        team:teams!members_team_id_fkey (
          name
        )
      `
      )
      .order("full_name");

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: members, error: membersError } = await query;

    if (membersError) {
      console.error("멤버 목록 조회 오류:", membersError);
      return NextResponse.json(
        { error: "멤버 목록 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    // 응답 형태 정리
    const result = (members || []).map((m) => {
      const team = m.team as { name: string } | null;
      return {
        id: m.id,
        full_name: m.full_name,
        member_role: m.member_role,
        team_id: m.team_id,
        team_name: team?.name || null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("멤버 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "멤버 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
