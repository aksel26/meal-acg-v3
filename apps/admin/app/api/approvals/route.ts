import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/approvals - 승인 요청 목록 조회
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get("status"); // pending, approved, rejected
    const type = searchParams.get("type"); // leave, overtime

    let query = supabase
      .from("approval_requests")
      .select(
        `
        *,
        requester:members!approval_requests_requester_id_fkey(id, full_name),
        approver:members!approval_requests_approver_id_fkey(id, full_name),
        resolver:members!approval_requests_resolved_by_fkey(id, full_name)
      `
      )
      .order("requested_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching approvals:", error);
      return NextResponse.json(
        { error: "Failed to fetch approvals" },
        { status: 500 }
      );
    }

    // 관련 dayoff 정보를 추가로 조회
    const dayoffIds = (data || [])
      .filter((r) => r.related_table === "dayoffs" && r.related_id)
      .map((r) => r.related_id!);
    const workApplicationIds = (data || [])
      .filter((r) => r.related_table === "work_applications" && r.related_id)
      .map((r) => r.related_id!);

    let dayoffsMap: Record<string, unknown> = {};
    let workApplicationsMap: Record<string, unknown> = {};
    if (dayoffIds.length > 0) {
      const { data: dayoffs } = await supabase
        .from("dayoffs")
        .select(
          `
          *,
          target:members!dayoffs_target_id_fkey(id, full_name),
          leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category),
          first_approver:members!dayoffs_first_approver_id_fkey(id, full_name),
          final_approver:members!dayoffs_final_approver_id_fkey(id, full_name)
        `
        )
        .in("id", dayoffIds);

      if (dayoffs) {
        dayoffsMap = Object.fromEntries(dayoffs.map((d) => [d.id, d]));
      }
    }

    if (workApplicationIds.length > 0) {
      const { data: workApplications } = await supabase
        .from("work_applications")
        .select("*")
        .in("id", workApplicationIds);

      if (workApplications) {
        workApplicationsMap = Object.fromEntries(
          workApplications.map((application) => [application.id, application]),
        );
      }
    }

    const result = (data || []).map((r) => ({
      ...r,
      related_data:
        r.related_table === "dayoffs" && r.related_id
          ? dayoffsMap[r.related_id] || null
          : r.related_table === "work_applications" && r.related_id
            ? workApplicationsMap[r.related_id] || null
          : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Approvals API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
