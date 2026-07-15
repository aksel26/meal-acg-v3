import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { HIDDEN_MEMBER_NAMES } from "@/lib/constants";

function halfYearToDateRange(period: string): { start: string; end: string } | null {
  const match = period.match(/^(\d{4})-H([12])$/);
  if (!match) return null;
  const year = match[1];
  if (match[2] === "1") {
    return { start: `${year}-01-01`, end: `${year}-06-30` };
  }
  return { start: `${year}-07-01`, end: `${year}-12-31` };
}

// GET /api/points-overview?period=2026-H1
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period");
    if (!period) {
      return NextResponse.json(
        { error: "period parameter is required" },
        { status: 400 },
      );
    }

    const range = halfYearToDateRange(period);
    if (!range) {
      return NextResponse.json(
        { error: "Invalid period format. Use YYYY-H1 or YYYY-H2" },
        { status: 400 },
      );
    }

    // 1) budget_summary에서 전체 멤버 summary 조회
    const { data: summaryData, error: summaryError } = await supabase
      .from("budget_summary")
      .select("*")
      .eq("period", period);

    if (summaryError) {
      console.error("Error fetching budget summary:", summaryError);
      return NextResponse.json(
        { error: "Failed to fetch budget summary" },
        { status: 500 },
      );
    }

    // 퇴사자 제외 대상 조회
    const { data: resignedMembers, error: resignedError } = await supabase
      .from("member_current_status")
      .select("member_id")
      .eq("current_status", "퇴사");

    if (resignedError) {
      console.error("Error fetching resigned members:", resignedError);
      return NextResponse.json(
        { error: "Failed to fetch resigned members" },
        { status: 500 },
      );
    }

    const resignedMemberIds = new Set(
      (resignedMembers || [])
        .map((m) => m.member_id)
        .filter((id): id is string => Boolean(id)),
    );

    // 2) usage_records에서 월별 사용 금액 집계
    const { data: usageData, error: usageError } = await supabase
      .from("usage_records")
      .select("member_id, type, amount, used_at")
      .gte("used_at", range.start)
      .lte("used_at", range.end);

    if (usageError) {
      console.error("Error fetching usage records:", usageError);
      return NextResponse.json(
        { error: "Failed to fetch usage records" },
        { status: 500 },
      );
    }

    // 월별 집계: { member_id -> { type -> { month -> sum } } }
    const monthlyMap = new Map<string, Map<string, Map<number, number>>>();
    for (const record of usageData || []) {
      const month = new Date(record.used_at).getMonth() + 1;
      if (!monthlyMap.has(record.member_id)) {
        monthlyMap.set(record.member_id, new Map());
      }
      const typeMap = monthlyMap.get(record.member_id)!;
      if (!typeMap.has(record.type)) {
        typeMap.set(record.type, new Map());
      }
      const mMap = typeMap.get(record.type)!;
      mMap.set(month, (mMap.get(month) || 0) + record.amount);
    }

    // 3) 병합
    const memberMap = new Map<
      string,
      {
        member_id: string;
        member_name: string;
        member_role: string;
        team_name: string | null;
        activity: {
          total_amount: number;
          used_amount: number;
          remaining_amount: number;
          monthly: Record<number, number>;
        };
        welfare: {
          total_amount: number;
          used_amount: number;
          remaining_amount: number;
          monthly: Record<number, number>;
        };
      }
    >();

    for (const row of summaryData || []) {
      if (!row.member_id) continue;

      if (!memberMap.has(row.member_id)) {
        memberMap.set(row.member_id, {
          member_id: row.member_id,
          member_name: row.member_name || "",
          member_role: row.member_role || "",
          team_name: row.team_name || null,
          activity: {
            total_amount: 0,
            used_amount: 0,
            remaining_amount: 0,
            monthly: {},
          },
          welfare: {
            total_amount: 0,
            used_amount: 0,
            remaining_amount: 0,
            monthly: {},
          },
        });
      }

      const member = memberMap.get(row.member_id)!;
      const bucket = row.type === "활동비" ? "activity" : "welfare";
      member[bucket] = {
        total_amount: row.total_amount || 0,
        used_amount: row.used_amount || 0,
        remaining_amount: row.remaining_amount || 0,
        monthly: {},
      };
    }

    // 월별 데이터 병합
    for (const [memberId, typeMap] of monthlyMap) {
      if (!memberMap.has(memberId)) continue;
      const member = memberMap.get(memberId)!;

      for (const [type, mMap] of typeMap) {
        const bucket = type === "활동비" ? "activity" : "welfare";
        const monthly: Record<number, number> = {};
        for (const [month, amount] of mMap) {
          monthly[month] = amount;
        }
        member[bucket].monthly = monthly;
      }
    }

    const members = Array.from(memberMap.values())
      .filter(
        (m) =>
          !HIDDEN_MEMBER_NAMES.has(m.member_name) &&
          !resignedMemberIds.has(m.member_id),
      )
      .sort((a, b) => {
        const roleOrder: Record<string, number> = { 대표: 0, 본부장: 1, 팀장: 2, 팀원: 3 };
        const ra = roleOrder[a.member_role] ?? 4;
        const rb = roleOrder[b.member_role] ?? 4;
        if (ra !== rb) return ra - rb;
        return a.member_name.localeCompare(b.member_name, "ko");
      });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Points overview API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
