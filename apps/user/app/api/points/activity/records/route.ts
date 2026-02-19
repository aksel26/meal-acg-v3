import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET: 특정 allocation의 사용내역 조회 (읽기 전용 — 모든 사용자 접근 가능)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("member_id");
    const allocationId = searchParams.get("allocation_id");
    const yearMonth = searchParams.get("year_month"); // optional: "YYYY-MM"

    if (!memberId) {
      return NextResponse.json(
        { error: "member_id는 필수입니다." },
        { status: 400 }
      );
    }

    if (!allocationId) {
      return NextResponse.json(
        { error: "allocation_id는 필수입니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB not configured" },
        { status: 500 }
      );
    }

    // usage_records에서 allocation_id로 필터
    let query = supabase
      .from("usage_records")
      .select(
        `
        *,
        member:members!usage_records_member_id_fkey (
          id, full_name, member_role
        )
      `
      )
      .eq("allocation_id", allocationId)
      .order("used_at", { ascending: false });

    // year_month 제공 시 월 필터
    if (yearMonth) {
      const parts = yearMonth.split("-").map(Number);
      const year = parts[0]!;
      const month = parts[1]!;
      const startDate = `${yearMonth}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      query = query.gte("used_at", startDate).lt("used_at", endDate);
    }

    const { data: records, error: recordsError } = await query;

    if (recordsError) {
      console.error("사용내역 조회 오류:", recordsError);
      return NextResponse.json(
        { error: "사용내역 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(records || []);
  } catch (error) {
    console.error("활동비 사용내역 조회 오류:", error);
    return NextResponse.json(
      { error: "사용내역 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
