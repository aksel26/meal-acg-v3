import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// "YYYY-MM" → "YYYY-H1" or "YYYY-H2" 변환
function toHalfYearPeriod(monthlyPeriod: string): string {
  const parts = monthlyPeriod.split("-");
  const half = parseInt(parts[1] ?? "1", 10) <= 6 ? "H1" : "H2";
  return `${parts[0]}-${half}`;
}

// "2026-H1" → { start: "2026-01-01", end: "2026-06-30" }
// "2026-H2" → { start: "2026-07-01", end: "2026-12-31" }
function halfYearToDateRange(period: string): { start: string; end: string } | null {
  const match = period.match(/^(\d{4})-H([12])$/);
  if (!match) return null;
  const year = match[1];
  if (match[2] === "1") {
    return { start: `${year}-01-01`, end: `${year}-06-30` };
  }
  return { start: `${year}-07-01`, end: `${year}-12-31` };
}

// GET /api/points/all-records - 조직 전체 사용 내역 조회
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);

    const memberId = sessionUser.id;
    const period = searchParams.get("period");
    const type = searchParams.get("type");
    const filterMemberId = searchParams.get("filter_member_id");
    const reviewStatus = searchParams.get("review_status");
    const limitStr = searchParams.get("limit");
    const offsetStr = searchParams.get("offset");

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB not configured" },
        { status: 500 }
      );
    }

    // 현재 사용자의 조직 확인
    const { data: currentMember, error: memberError } = await supabase
      .from("members")
      .select("organization_id")
      .eq("id", memberId)
      .single();

    if (memberError || !currentMember) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!currentMember.organization_id) {
      return NextResponse.json(
        { error: "조직 정보가 설정되지 않았습니다." },
        { status: 400 }
      );
    }

    // 같은 조직의 멤버 ID 목록 조회 (임베디드 필터 대신 직접 필터링)
    const { data: orgMembers } = await supabase
      .from("members")
      .select("id")
      .eq("organization_id", currentMember.organization_id);

    const orgMemberIds = orgMembers?.map((m: { id: string }) => m.id) || [];

    // 같은 조직의 모든 usage_records 조회
    let query = supabase
      .from("usage_records")
      .select(
        `
        *,
        member:members!usage_records_member_id_fkey (
          id,
          full_name,
          team:teams(name)
        )
      `,
        { count: "exact" }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;

    // 같은 조직 필터링 (member_id IN 방식)
    if (orgMemberIds.length > 0) {
      query = query.in("member_id", orgMemberIds);
    }

    // period 필터
    if (period && period !== "all") {
      // Half-year 형식 체크 (YYYY-H1 또는 YYYY-H2)
      const range = halfYearToDateRange(period);
      if (range) {
        query = query.gte("used_at", range.start).lte("used_at", range.end);
      } else {
        // Monthly 형식 (YYYY-MM)
        const monthStart = `${period}-01`;
        const nextMonth = new Date(`${period}-01T00:00:00`);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthEnd = nextMonth.toISOString().slice(0, 10);
        query = query.gte("used_at", monthStart).lt("used_at", monthEnd);
      }
    }

    // type 필터
    if (type && type !== "all") {
      const validType = type as "복지포인트" | "활동비";
      query = query.eq("type", validType);
    }

    // filter_member_id 필터 (특정 사용자)
    if (filterMemberId) {
      query = query.eq("member_id", filterMemberId);
    }

    // review_status 필터
    if (reviewStatus && reviewStatus !== "all") {
      const statusNum = parseInt(reviewStatus, 10);
      if (!isNaN(statusNum)) {
        query = query.eq("review_status", statusNum);
      }
    }

    // 페이지네이션
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    // 정렬 및 페이지네이션 적용
    const { data: records, error, count } = await query
      .order("used_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("전체 내역 조회 오류:", error);
      return NextResponse.json(
        { error: "전체 내역 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    // 응답 형식 변환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedRecords = (records || []).map((record: any) => {
      const rec = record;
      return {
        id: rec.id,
        member_id: rec.member_id,
        member_name: rec.member?.full_name || "알 수 없음",
        team_name: rec.member?.team?.name || null,
        type: rec.type,
        amount: rec.amount,
        description: rec.description,
        used_at: rec.used_at,
        is_reviewed: rec.is_reviewed,
        review_status: rec.review_status ?? 0,
        notes: rec.notes || null,
        delay_reason: rec.delay_reason || null,
        created_at: rec.created_at,
      };
    });

    // 총 금액 계산
    const totalAmount = formattedRecords.reduce(
      (sum: number, r: { amount: number }) => sum + r.amount,
      0
    );

    return NextResponse.json({
      records: formattedRecords,
      total_count: count || 0,
      total_amount: totalAmount,
      has_more: count ? count > offset + limit : false,
    });
  } catch (error) {
    console.error("전체 내역 조회 중 오류:", error);
    return NextResponse.json(
      { error: "전체 내역 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
