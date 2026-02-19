import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET: 현재 사용자 포인트 관련 정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("member_id");

    if (!memberId) {
      return NextResponse.json(
        { error: "member_id는 필수입니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB not configured" },
        { status: 500 }
      );
    }

    // 멤버 정보를 조직, 팀, 본부 정보와 함께 조회
    const { data: member, error } = await supabase
      .from("members")
      .select(
        `
        id,
        full_name,
        member_role,
        team:teams!members_team_id_fkey (
          id, name
        ),
        division:divisions!members_division_id_fkey (
          id, name
        ),
        organization:organizations!members_organization_id_fkey (
          id, name
        )
      `
      )
      .eq("id", memberId)
      .single();

    if (error || !member) {
      console.error("멤버 정보 조회 오류:", error);
      return NextResponse.json(
        { error: "멤버 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 응답 데이터 구성
    const team = member.team as { id: string; name: string } | null;
    const division = member.division as { id: string; name: string } | null;
    const organization = member.organization as {
      id: string;
      name: string;
    } | null;

    return NextResponse.json({
      id: member.id,
      full_name: member.full_name,
      member_role: member.member_role,
      team_name: team?.name || null,
      division_name: division?.name || null,
      organization_name: organization?.name || null,
    });
  } catch (error) {
    console.error("내 정보 조회 오류:", error);
    return NextResponse.json(
      { error: "내 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
