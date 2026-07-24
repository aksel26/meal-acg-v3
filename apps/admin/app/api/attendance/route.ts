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
        `*, member:members!attendance_records_member_id_fkey(id, full_name, birth_date, position:positions!members_position_id_fkey(name))`,
      )
      .order("date", { ascending: true })
      .order("member_id", { ascending: true });

    const allMembers = searchParams.get("allMembers");

    if (date && allMembers === "true") {
      // 전체 멤버 + 해당 날짜 출퇴근 기록 병합
      const { data: members, error: membersError } = await supabase
        .from("member_current_status")
        .select(
          "member_id, full_name, birth_date, position_name, title_name, current_status",
        )
        .is("current_status", null);

      if (membersError) {
        return NextResponse.json({ error: "멤버 조회 실패" }, { status: 500 });
      }

      const { data: records, error: recordsError } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("date", date);

      if (recordsError) {
        return NextResponse.json({ error: "출퇴근 조회 실패" }, { status: 500 });
      }

      const recordMap = new Map(
        (records || []).map((r) => [r.member_id, r])
      );

      const merged = (members || []).map((m) => {
        const rec = recordMap.get(m.member_id);
        return {
          id: rec?.id || null,
          member_id: m.member_id,
          date,
          check_in_at: rec?.check_in_at || null,
          check_out_at: rec?.check_out_at || null,
          status: rec?.status || "pending",
          attendance_type: rec?.attendance_type || "출근",
          overtime_minutes: rec?.overtime_minutes || 0,
          is_weekend: rec?.is_weekend || false,
          note: rec?.note || null,
          location: rec?.location || null,
          reference: rec?.reference || null,
          modifier_id: rec?.modifier_id || null,
          approver_id: rec?.approver_id || null,
          approved_at: rec?.approved_at || null,
          login_ip: rec?.login_ip || null,
          login_ip2: rec?.login_ip2 || null,
          created_at: rec?.created_at || null,
          updated_at: rec?.updated_at || null,
          member: {
            id: m.member_id,
            full_name: m.full_name,
            birth_date: m.birth_date,
            position: { name: m.position_name || "-" },
            title: { name: m.title_name || null },
          },
          modifier: null,
          approver: null,
        };
      });

      return NextResponse.json(merged);
    } else if (date) {
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

// POST /api/attendance - 출퇴근 기록 생성 (admin 수동 입력)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      member_id, date, check_in_at, check_out_at, status, note,
      attendance_type, location, reference, modifier_id,
      approver_id, approved_at, login_ip, login_ip2,
    } = body;

    if (!member_id || !date) {
      return NextResponse.json(
        { error: "member_id와 date는 필수입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(
        {
          member_id,
          date,
          check_in_at: check_in_at || null,
          check_out_at: check_out_at || null,
          status: status || "normal",
          attendance_type: attendance_type || "출근",
          note: note || null,
          location: location || null,
          reference: reference || null,
          modifier_id: modifier_id || null,
          approver_id: approver_id || null,
          approved_at: approved_at || null,
          login_ip: login_ip || null,
          login_ip2: login_ip2 || null,
        },
        { onConflict: "member_id,date" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error creating attendance:", error);
      return NextResponse.json(
        { error: "출퇴근 기록 생성 실패", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Attendance POST error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
