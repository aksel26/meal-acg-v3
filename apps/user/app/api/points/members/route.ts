import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// GET: 멤버 목록 조회 (세션 사용자와 같은 조직만)
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }
    const memberId = sessionUser.id;

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    // 세션 사용자의 organization_id 조회
    const { data: currentMember, error: memberError } = await supabase
      .from("members")
      .select("id, organization_id")
      .eq("id", memberId)
      .single();

    if (memberError || !currentMember) {
      return NextResponse.json(
        { error: "멤버 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!currentMember.organization_id) {
      return NextResponse.json(
        { error: "멤버의 조직 정보가 없습니다." },
        { status: 400 },
      );
    }

    const organizationId = currentMember.organization_id;

    // 같은 조직 멤버만 조회
    const query = supabase
      .from("members")
      .select(
        `
        id,
        full_name,
        member_role,
        user_authority,
        division_id,
        team_id,
        team:teams!members_team_id_fkey (
          name,
          division_id
        )
      `,
      )
      .order("full_name")
      .eq("organization_id", organizationId);

    const { data: members, error: membersError } = await query;

    if (membersError) {
      console.error("멤버 목록 조회 오류:", membersError);
      return NextResponse.json(
        { error: "멤버 목록 조회에 실패했습니다." },
        { status: 500 },
      );
    }

    // 응답 형태 정리
    const result = (members || []).map((m) => {
      const team = m.team as {
        name: string;
        division_id: string | null;
      } | null;
      return {
        id: m.id,
        full_name: m.full_name,
        member_role: m.member_role,
        user_authority: m.user_authority,
        division_id: m.division_id || team?.division_id || null,
        team_id: m.team_id,
        team_name: team?.name || null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("멤버 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "멤버 목록 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
