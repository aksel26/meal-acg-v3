import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// "YYYY-MM" → "YYYY-H1" or "YYYY-H2" 변환
function toHalfYearPeriod(monthlyPeriod: string): string {
  const parts = monthlyPeriod.split("-");
  const half = parseInt(parts[1] ?? "1", 10) <= 6 ? "H1" : "H2";
  return `${parts[0]}-${half}`;
}

// "2026-H1" → { start: "2026-01-01", end: "2026-06-30" }
// "2026-H2" → { start: "2026-07-01", end: "2026-12-31" }
function halfYearToDateRange(
  period: string,
): { start: string; end: string } | null {
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
    const { searchParams } = new URL(request.url);

    const memberId = searchParams.get("member_id");
    const period = searchParams.get("period");
    const type = searchParams.get("type");
    const filterMemberId = searchParams.get("filter_member_id");
    const reviewStatus = searchParams.get("review_status");
    const limitStr = searchParams.get("limit");
    const offsetStr = searchParams.get("offset");
    const summary = searchParams.get("summary") === "true";
    const limit = limitStr === null ? 50 : Number(limitStr);
    const offset = offsetStr === null ? 0 : Number(offsetStr);

    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(offset + limit) ||
      (period &&
        period !== "all" &&
        !/^\d{4}-(0[1-9]|1[0-2]|H[12])$/.test(period)) ||
      (type && !["all", "복지포인트", "활동비"].includes(type)) ||
      (reviewStatus && !["all", "0", "1", "2"].includes(reviewStatus))
    ) {
      return NextResponse.json(
        { error: "조회 조건이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    // member_id 필수 검증 (현재 사용자 확인용)
    if (!memberId) {
      return NextResponse.json(
        { error: "member_id는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
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
        { status: 404 },
      );
    }

    if (!currentMember.organization_id) {
      return NextResponse.json(
        { error: "조직 정보가 설정되지 않았습니다." },
        { status: 400 },
      );
    }

    // 조직 필터를 DB에 적용해 매 페이지마다 전체 멤버 ID를 가져오지 않는다.
    const buildQuery = () => {
      let query = supabase
        .from("usage_records")
        .select(
          summary
            ? "id, amount, member:members!usage_records_member_id_fkey!inner()"
            : "id, type, amount, description, used_at, member:members!usage_records_member_id_fkey!inner(full_name)",
          summary ? undefined : { count: "exact" },
        )
        .eq("member.organization_id", currentMember.organization_id!);

      // period 필터
      if (period && period !== "all") {
        // Half-year 형식 체크 (YYYY-H1 또는 YYYY-H2)
        const range = halfYearToDateRange(period);
        if (range) {
          query = query.gte("used_at", range.start).lte("used_at", range.end);
        } else {
          // Monthly 형식 (YYYY-MM)
          const monthStart = `${period}-01`;
          const nextMonth = new Date(`${period}-01T00:00:00Z`);
          nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
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
      return query;
    };

    if (summary) {
      let cursor: string | undefined;
      let totalCount = 0;
      let totalAmount = 0;
      // ponytail: 합계는 O(n) 최소 필드 조회. 조직별 월 데이터가 커지면 DB 집계 RPC로 교체.
      while (true) {
        let query = buildQuery().order("id").limit(1000);
        if (cursor) query = query.gt("id", cursor);
        const { data, error } = await query.overrideTypes<
          { id: string; amount: number }[],
          { merge: false }
        >();
        if (error) throw error;
        if (!data?.length) break;
        totalCount += data.length;
        totalAmount += data.reduce((sum, row) => sum + row.amount, 0);
        cursor = data[data.length - 1]!.id;
      }
      return NextResponse.json({
        records: [],
        total_count: totalCount,
        total_amount: totalAmount,
        has_more: false,
      });
    }

    // 정렬 및 페이지네이션 적용
    const {
      data: records,
      error,
      count,
    } = await buildQuery()
      .order("used_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1)
      .overrideTypes<
        {
          id: string;
          type: string;
          amount: number;
          description: string;
          used_at: string;
          member: { full_name: string };
        }[],
        { merge: false }
      >();

    if (error) {
      console.error("전체 내역 조회 오류:", error);
      return NextResponse.json(
        { error: "전체 내역 조회에 실패했습니다." },
        { status: 500 },
      );
    }

    // 응답 형식 변환
    const formattedRecords = (records || []).map((record) => {
      const rec = record;
      return {
        id: rec.id,
        member_name: rec.member?.full_name || "알 수 없음",
        type: rec.type,
        amount: rec.amount,
        description: rec.description,
        used_at: rec.used_at,
      };
    });

    // 총 금액 계산
    const totalAmount = formattedRecords.reduce(
      (sum: number, r: { amount: number }) => sum + r.amount,
      0,
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
      { status: 500 },
    );
  }
}
