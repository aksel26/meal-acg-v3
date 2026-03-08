import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/dayoffs/stats - 월별 근태 통계 (직원별 × 유형별 건수)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json(
        { error: "year and month are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("get_dayoff_monthly_stats", {
      p_year: parseInt(year),
      p_month: parseInt(month),
    });

    if (error) {
      console.error("Error fetching dayoff stats:", error);
      return NextResponse.json(
        { error: "Failed to fetch dayoff stats" },
        { status: 500 }
      );
    }

    // 직원별로 그룹화하여 피벗 형태로 변환
    const memberMap = new Map<
      string,
      {
        member_id: string;
        member_name: string;
        team_name: string | null;
        types: Record<number, number>;
      }
    >();

    for (const row of data || []) {
      if (!memberMap.has(row.member_id)) {
        memberMap.set(row.member_id, {
          member_id: row.member_id,
          member_name: row.member_name,
          team_name: row.team_name,
          types: {},
        });
      }
      memberMap.get(row.member_id)!.types[row.leave_type_id] = Number(
        row.count
      );
    }

    return NextResponse.json(Array.from(memberMap.values()));
  } catch (error) {
    console.error("Dayoffs stats API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
