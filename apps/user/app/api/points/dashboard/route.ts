import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// "YYYY-MM" → "YYYY-H1" or "YYYY-H2", "YYYY-H1"/"YYYY-H2"는 그대로
function toHalfYearPeriod(period: string): string {
  if (period.includes("H")) return period;
  const parts = period.split("-");
  const half = parseInt(parts[1] ?? "1", 10) <= 6 ? "H1" : "H2";
  return `${parts[0]}-${half}`;
}

// GET: 조직 전체 예산 현황 조회 (읽기 전용)
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const memberId = sessionUser.id;
    const period = searchParams.get("period");
    const type = searchParams.get("type"); // optional: '복지포인트' | '활동비'

    if (!period) {
      return NextResponse.json(
        { error: "period는 필수입니다." },
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

    // 멤버의 organization_id 조회
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, organization_id")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "멤버 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!member.organization_id) {
      return NextResponse.json(
        { error: "멤버의 조직 정보가 없습니다." },
        { status: 400 }
      );
    }

    // 같은 조직의 모든 멤버 ID 조회
    const { data: orgMembers, error: orgMembersError } = await supabase
      .from("members")
      .select("id")
      .eq("organization_id", member.organization_id);

    if (orgMembersError) {
      console.error("조직 멤버 조회 오류:", orgMembersError);
      return NextResponse.json(
        { error: "조직 멤버 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    const memberIds = (orgMembers || []).map((m) => m.id);

    if (memberIds.length === 0) {
      return NextResponse.json([]);
    }

    // budget_summary 뷰에서 조직 내 모든 멤버의 예산 요약 조회
    const halfYearPeriod = toHalfYearPeriod(period);
    let query = supabase
      .from("budget_summary")
      .select("*")
      .in("member_id", memberIds)
      .eq("period", halfYearPeriod);

    // type 필터 적용 (선택적)
    if (type === "복지포인트" || type === "활동비") {
      query = query.eq("type", type);
    }

    const { data: summaries, error: summariesError } = await query.order(
      "member_name"
    );

    if (summariesError) {
      console.error("예산 현황 조회 오류:", summariesError);
      return NextResponse.json(
        { error: "예산 현황 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(summaries || []);
  } catch (error) {
    console.error("대시보드 조회 오류:", error);
    return NextResponse.json(
      { error: "대시보드 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
