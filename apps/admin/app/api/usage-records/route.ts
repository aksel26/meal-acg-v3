import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

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

// GET /api/usage-records - List usage records with filters
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period");
    const type = searchParams.get("type");
    const memberId = searchParams.get("member_id");
    const reviewStatus = searchParams.get("review_status");
    const allocationId = searchParams.get("allocation_id");

    // 무필터 요청은 usage_records 전체 반환이 되므로 차단 (UI는 항상 period를 보냄)
    if (!period && !type && !memberId && reviewStatus === null && !allocationId) {
      return NextResponse.json(
        { error: "At least one filter is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("usage_records")
      .select(
        "*, members!usage_records_member_id_fkey(id, full_name), first_reviewer:members!usage_records_first_reviewed_by_fkey(full_name), second_reviewer:members!usage_records_second_reviewed_by_fkey(full_name)"
      );

    if (period) {
      const range = halfYearToDateRange(period);
      if (range) {
        query = query.gte("used_at", range.start).lte("used_at", range.end);
      } else {
        query = query.like("used_at", `${period}%`);
      }
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (memberId) {
      query = query.eq("member_id", memberId);
    }
    if (reviewStatus !== null && reviewStatus !== undefined) {
      if (reviewStatus === "in_progress") {
        query = query.in("review_status", [1, 2]);
      } else {
        query = query.eq("review_status", parseInt(reviewStatus, 10));
      }
    }
    if (allocationId) {
      query = query.eq("allocation_id", allocationId);
    }

    // 퇴사자 기록 제외
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

    const resignedIds = (resignedMembers || [])
      .map((m) => m.member_id)
      .filter((id): id is string => Boolean(id));

    if (resignedIds.length > 0) {
      query = query.not("member_id", "in", `(${resignedIds.join(",")})`);
    }

    const { data, error } = await query
      .order("no", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching usage records:", error);
      return NextResponse.json(
        { error: "Failed to fetch usage records" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Usage records API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
