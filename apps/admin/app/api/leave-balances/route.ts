import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/leave-balances?year=2026 - 연도별 전체 멤버 연차 현황 조회
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    const { data, error } = await supabase
      .from("leave_balances")
      .select(
        "*, member:members!leave_balances_member_id_fkey(id, full_name, hire_date, position:positions!members_position_id_fkey(name))"
      )
      .eq("year", year)
      .order("member_id");

    if (error) {
      console.error("Error fetching leave balances:", error);
      return NextResponse.json(
        { error: "Failed to fetch leave balances" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Leave balances GET error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/leave-balances - 개별 연차 수동 등록
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const body = await request.json();
    const { member_id, year, type, granted, note } = body;

    if (!member_id || !year || !type) {
      return NextResponse.json(
        { error: "member_id, year, type은 필수입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("leave_balances")
      .insert({ member_id, year, type, granted: granted ?? 0, note })
      .select()
      .single();

    if (error) {
      console.error("Error inserting leave balance:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 해당 연도/유형의 연차가 존재합니다." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create leave balance" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Leave balances POST error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
