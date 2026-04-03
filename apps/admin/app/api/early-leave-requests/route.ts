import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/early-leave-requests - 조기퇴근 요청 목록 조회
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get("status"); // pending, pre_approved, approved, rejected

    let query = supabase
      .from("early_leave_requests")
      .select(
        `
        *,
        requester:members!early_leave_requests_requester_id_fkey(id, full_name),
        first_approver:members!early_leave_requests_first_approver_id_fkey(id, full_name),
        final_approver:members!early_leave_requests_final_approver_id_fkey(id, full_name),
        attendance_record:attendance_records!early_leave_requests_attendance_record_id_fkey(
          id, date, check_in_at, check_out_at, status, overtime_minutes
        )
      `
      )
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("approval_status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching early leave requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch early leave requests" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Early leave requests API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
