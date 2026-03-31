import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET /api/my-requests?memberId=xxx - 내가 신청한 승인 요청 목록
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const status = searchParams.get("status");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId가 필요합니다." },
        { status: 400 }
      );
    }

    let query = supabase
      .from("approval_requests")
      .select(
        `
        *,
        approver:members!approval_requests_approver_id_fkey(id, full_name)
      `
      )
      .eq("requester_id", memberId)
      .order("requested_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching my requests:", error);
      return NextResponse.json(
        { error: "내 신청 목록 조회 실패" },
        { status: 500 }
      );
    }

    // 관련 dayoff 정보 조회
    const dayoffIds = (data || [])
      .filter((r) => r.related_table === "dayoffs" && r.related_id)
      .map((r) => r.related_id!);

    let dayoffsMap: Record<string, unknown> = {};
    if (dayoffIds.length > 0) {
      const { data: dayoffs } = await supabase
        .from("dayoffs")
        .select(
          `
          *,
          leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category)
        `
        )
        .in("id", dayoffIds);

      if (dayoffs) {
        dayoffsMap = Object.fromEntries(dayoffs.map((d) => [d.id, d]));
      }
    }

    const result = (data || []).map((r) => ({
      ...r,
      related_data:
        r.related_table === "dayoffs" && r.related_id
          ? dayoffsMap[r.related_id] || null
          : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("My requests API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
