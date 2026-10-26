import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { authErrorResponse } from "@/lib/lunch-group-audit";

// PATCH: 한 명을 다른 조로 옮기거나(targetGroupNumber) 조에서 뺀다(null)
// 정원·중복 검사와 이동은 DB 함수가 주차 잠금 안에서 처리한다.
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { weekStartDate, memberId, targetGroupNumber } = body as {
      weekStartDate: string;
      memberId: string;
      targetGroupNumber: number | null;
    };

    if (!weekStartDate || !memberId || targetGroupNumber === undefined) {
      return NextResponse.json(
        { error: "weekStartDate, memberId, targetGroupNumber가 필요합니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { error } = await supabase.rpc("move_lunch_group_member", {
      p_week_start_date: weekStartDate,
      p_member_id: memberId,
      p_target_group_number: targetGroupNumber,
      p_changed_by: session.userId,
    });

    if (error) {
      console.error("Error moving lunch group member:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Lunch group member API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
