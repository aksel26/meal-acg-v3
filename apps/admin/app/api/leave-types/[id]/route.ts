import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/leave-types/:id - 커스텀 유형 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    // is_system 체크
    const { data: existing } = await supabase
      .from("leave_types")
      .select("is_system")
      .eq("id", parseInt(id))
      .single();

    if (existing?.is_system) {
      return NextResponse.json(
        { error: "시스템 유형은 수정할 수 없습니다." },
        { status: 403 }
      );
    }

    const { name, category, duration_type, include_in_stats, deducts_annual, deduction_amount, has_separate_quota, default_quota } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (duration_type !== undefined) updateData.duration_type = duration_type;
    if (include_in_stats !== undefined) updateData.include_in_stats = include_in_stats;
    if (deducts_annual !== undefined) updateData.deducts_annual = deducts_annual;
    if (deduction_amount !== undefined) updateData.deduction_amount = deduction_amount;
    if (has_separate_quota !== undefined) updateData.has_separate_quota = has_separate_quota;
    if (default_quota !== undefined) updateData.default_quota = default_quota;

    const { data, error } = await supabase
      .from("leave_types")
      .update(updateData)
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      console.error("Error updating leave type:", error);
      return NextResponse.json(
        { error: "유형 수정 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Leave type PUT error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/leave-types/:id - 커스텀 유형 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    // is_system 체크
    const { data: existing } = await supabase
      .from("leave_types")
      .select("is_system")
      .eq("id", parseInt(id))
      .single();

    if (existing?.is_system) {
      return NextResponse.json(
        { error: "시스템 유형은 삭제할 수 없습니다." },
        { status: 403 }
      );
    }

    // 사용 중인지 확인
    const { count } = await supabase
      .from("dayoffs")
      .select("id", { count: "exact", head: true })
      .eq("leave_type_id", parseInt(id))
      .eq("is_deleted", false);

    if (count && count > 0) {
      return NextResponse.json(
        { error: `이 유형을 사용하는 근태 기록이 ${count}건 있어 삭제할 수 없습니다.` },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("leave_types")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      console.error("Error deleting leave type:", error);
      return NextResponse.json(
        { error: "유형 삭제 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave type DELETE error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
