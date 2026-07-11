import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// GET /api/my-requests - 내가 신청한 승인 요청 목록 (세션 본인 기준)
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = sessionUser.id;
    const status = searchParams.get("status");

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
    const attendanceModifyIds = (data || [])
      .filter(
        (r) =>
          r.related_table === "attendance_modification_requests" &&
          r.related_id,
      )
      .map((r) => r.related_id!);
    const workApplicationIds = (data || [])
      .filter((r) => r.related_table === "work_applications" && r.related_id)
      .map((r) => r.related_id!);

    // 서로 독립적인 세 관련 데이터 조회를 병렬 실행 (빈 목록은 즉시 resolve)
    const [dayoffsResult, modifyRequestsResult, workApplicationsResult] =
      await Promise.all([
        dayoffIds.length > 0
          ? supabase
              .from("dayoffs")
              .select(
                `
          *,
          leave_type:leave_types!dayoffs_leave_type_id_fkey(id, name, category)
        `
              )
              .in("id", dayoffIds)
          : Promise.resolve({ data: null }),
        attendanceModifyIds.length > 0
          ? supabase
              .from("attendance_modification_requests")
              .select(
                `
          *,
          attendance_record:attendance_records!attendance_modification_requests_attendance_record_id_fkey(
            id, member_id, date, attendance_type, check_in_at, check_out_at
          )
        `
              )
              .in("id", attendanceModifyIds)
          : Promise.resolve({ data: null }),
        workApplicationIds.length > 0
          ? supabase
              .from("work_applications")
              .select("*")
              .in("id", workApplicationIds)
          : Promise.resolve({ data: null }),
      ]);

    const dayoffsMap: Record<string, unknown> = dayoffsResult.data
      ? Object.fromEntries(dayoffsResult.data.map((d) => [d.id, d]))
      : {};
    const attendanceModifyMap: Record<string, unknown> = modifyRequestsResult.data
      ? Object.fromEntries(
          modifyRequestsResult.data.map((modifyRequest) => [
            modifyRequest.id,
            modifyRequest,
          ]),
        )
      : {};
    const workApplicationsMap: Record<string, unknown> = workApplicationsResult.data
      ? Object.fromEntries(
          workApplicationsResult.data.map((application) => [
            application.id,
            application,
          ]),
        )
      : {};

    const result = (data || []).map((r) => ({
      ...r,
      related_data:
        r.related_table === "dayoffs" && r.related_id
          ? dayoffsMap[r.related_id] || null
          : r.related_table === "attendance_modification_requests" && r.related_id
            ? attendanceModifyMap[r.related_id] || null
          : r.related_table === "work_applications" && r.related_id
            ? workApplicationsMap[r.related_id] || null
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
