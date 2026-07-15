import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// GET /api/approvals/cc - 내가 참조된 요청 목록 (세션 본인 기준)
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    const memberId = sessionUser.id;

    const { data: approvalIdRows, error: approvalIdsError } =
      await supabase.rpc("get_cc_approval_request_ids", {
        p_member_id: memberId,
        p_limit: 20,
      });

    if (approvalIdsError) {
      console.error("Error fetching cc approval ids:", approvalIdsError);
      return NextResponse.json(
        { error: "참조 목록 조회 실패" },
        { status: 500 },
      );
    }

    const approvalIds = (approvalIdRows || []).map((row) => row.approval_id);
    if (approvalIds.length === 0) return NextResponse.json([]);

    const { data, error } = await supabase
      .from("approval_requests")
      .select(
        `
        *,
        requester:members!approval_requests_requester_id_fkey(id, full_name),
        approver:members!approval_requests_approver_id_fkey(id, full_name)
      `,
      )
      .in("id", approvalIds);

    if (error) {
      console.error("Error fetching cc approvals:", error);
      return NextResponse.json(
        { error: "참조 목록 조회 실패" },
        { status: 500 },
      );
    }

    const orderById = new Map(
      approvalIds.map((approvalId, index) => [approvalId, index]),
    );
    const uniqueRequests = [...(data || [])].sort(
      (left, right) =>
        (orderById.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (orderById.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );

    // 관련 dayoff/근무 신청 정보
    const dayoffIds = uniqueRequests
      .filter((r) => r.related_table === "dayoffs" && r.related_id)
      .map((r) => r.related_id!);
    const workApplicationIds = uniqueRequests
      .filter((r) => r.related_table === "work_applications" && r.related_id)
      .map((r) => r.related_id!);

    let dayoffsMap: Record<string, unknown> = {};
    if (dayoffIds.length > 0) {
      const { data: dayoffs } = await supabase
        .from("dayoffs")
        .select(
          `
          *,
          target:members!dayoffs_target_id_fkey(id, full_name),
          leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category)
        `,
        )
        .in("id", dayoffIds);

      if (dayoffs) {
        dayoffsMap = Object.fromEntries(dayoffs.map((d) => [d.id, d]));
      }
    }

    let workApplicationsMap: Record<string, Record<string, unknown>> = {};
    if (workApplicationIds.length > 0) {
      const { data: workApplications, error: workApplicationsError } =
        await supabase
          .from("work_applications")
          .select("*")
          .in("id", workApplicationIds);

      if (workApplicationsError) {
        console.error(
          "Error fetching cc work applications:",
          workApplicationsError,
        );
        return NextResponse.json(
          { error: "참조 근무 신청 조회 실패" },
          { status: 500 },
        );
      }

      workApplicationsMap = Object.fromEntries(
        (workApplications || []).map((application) => [
          application.id,
          application,
        ]),
      );
    }

    const result = uniqueRequests.map((r) => ({
      ...r,
      status:
        r.related_table === "work_applications" && r.related_id
          ? workApplicationsMap[r.related_id]?.status || r.status
          : r.status,
      related_data:
        r.related_table === "dayoffs" && r.related_id
          ? dayoffsMap[r.related_id] || null
          : r.related_table === "work_applications" && r.related_id
            ? workApplicationsMap[r.related_id] || null
            : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("CC approvals API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
