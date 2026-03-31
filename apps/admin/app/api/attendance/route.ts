import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/attendance?date=YYYY-MM-DD  or  ?year=YYYY&month=MM
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const date = searchParams.get("date");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    let query = supabase
      .from("attendance_records")
      .select(
        `*, member:members!attendance_records_member_id_fkey(id, full_name, position:positions!members_position_id_fkey(name))`
      )
      .order("date", { ascending: true })
      .order("member_id", { ascending: true });

    if (date) {
      query = query.eq("date", date);
    } else if (year && month) {
      const m = month.padStart(2, "0");
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      query = query
        .gte("date", `${year}-${m}-01`)
        .lte("date", `${year}-${m}-${lastDay}`);
    } else {
      return NextResponse.json(
        { error: "date 또는 year+month 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching attendance records:", error);
      return NextResponse.json(
        { error: "출퇴근 기록 조회 실패", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Attendance API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
