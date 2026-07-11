import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// GET: 특정 allocation의 사용내역 조회 (읽기 전용 — 로그인 필요)
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const allocationId = searchParams.get("allocation_id");
    const yearMonth = searchParams.get("year_month"); // optional: "YYYY-MM"

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

    // allocation이 본인 소유인지 검증 (임의 allocation_id로 타인 활동비 상세 조회 차단)
    const { data: allocation } = await supabase
      .from("budget_allocations")
      .select("member_id")
      .eq("id", allocationId)
      .single();

    if (!allocation || allocation.member_id !== sessionUser.id) {
      return NextResponse.json(
        { error: "본인 예산의 사용내역만 조회할 수 있습니다." },
        { status: 403 }
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
