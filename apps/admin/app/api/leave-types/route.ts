import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/leave-types - 근태 유형 목록 조회
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("leave_types")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching leave types:", error);
      return NextResponse.json(
        { error: "Failed to fetch leave types" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Leave types API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/leave-types - 커스텀 근태 유형 추가
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { name, category, duration_type, include_in_stats, deducts_annual, deduction_amount, has_separate_quota, default_quota } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "name과 category는 필수입니다." },
        { status: 400 }
      );
    }

    // 다음 id와 sort_order 결정
    const { data: maxRow } = await supabase
      .from("leave_types")
      .select("id, sort_order")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    const nextId = (maxRow?.id || 0) + 1;
    const nextSort = (maxRow?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from("leave_types")
      .insert({
        id: nextId,
        name,
        category,
        duration_type: duration_type || "full",
        include_in_stats: include_in_stats ?? true,
        sort_order: nextSort,
        is_system: false,
        deducts_annual: deducts_annual ?? false,
        deduction_amount: deduction_amount ?? 0,
        has_separate_quota: has_separate_quota ?? false,
        default_quota: default_quota ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating leave type:", error);
      return NextResponse.json(
        { error: "유형 추가 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Leave types POST error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
