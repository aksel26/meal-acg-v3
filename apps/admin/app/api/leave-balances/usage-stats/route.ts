import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { APPROVED_LEAVE_STATUSES } from "utils/leave-status";

// GET /api/leave-balances/usage-stats?year=2026
// Returns: { leaveTypes: [{id, name, sort_order}], stats: [{member_id, full_name, position_name, hire_date, counts: {[type_id]: count}}] }
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const year = request.nextUrl.searchParams.get("year");

    if (!year) {
      return NextResponse.json(
        { error: "year 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    const yearNum = parseInt(year);
    const startDate = `${yearNum}-01-01`;
    const endDate = `${yearNum}-12-31`;

    // Fetch leave types
    const { data: leaveTypes } = await supabase
      .from("leave_types")
      .select("id, name, sort_order")
      .eq("include_in_stats", true)
      .order("sort_order");

    // Fetch all dayoffs for the year with member + leave_type info
    const { data: dayoffs } = await supabase
      .from("dayoffs")
      .select("target_id, leave_type_id")
      .eq("is_deleted", false)
      .in("approval_status", [...APPROVED_LEAVE_STATUSES])
      .gte("leave_date", startDate)
      .lte("leave_date", endDate);

    // Fetch active members
    const { data: members } = await supabase
      .from("member_current_status")
      .select("member_id, full_name, position_name, title_name, current_status")
      .is("current_status", null);

    // Count dayoffs per member per type
    const countMap = new Map<string, Map<number, number>>();
    for (const d of dayoffs || []) {
      if (!countMap.has(d.target_id)) countMap.set(d.target_id, new Map());
      const typeMap = countMap.get(d.target_id)!;
      typeMap.set(d.leave_type_id, (typeMap.get(d.leave_type_id) || 0) + 1);
    }

    // Build stats per member
    const stats = (members || []).map((m) => {
      const typeMap = countMap.get(m.member_id) || new Map();
      const counts: Record<number, number> = {};
      for (const [typeId, count] of typeMap) {
        counts[typeId] = count;
      }
      const total = Array.from(typeMap.values()).reduce((s, c) => s + c, 0);
      return {
        member_id: m.member_id,
        full_name: m.full_name,
        position_name: m.position_name,
        counts,
        total,
      };
    });

    return NextResponse.json({
      leaveTypes: leaveTypes || [],
      stats,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
