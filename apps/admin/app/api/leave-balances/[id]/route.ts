import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/leave-balances/[id] - 관리자 수동 조정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();

    const { id } = await params;
    const body = await request.json();
    const { adjustment, reason } = body;

    if (adjustment === undefined || adjustment === null || !reason) {
      return NextResponse.json(
        { error: "adjustment, reason은 필수입니다." },
        { status: 400 }
      );
    }

    // 1. leave_adjustments에 INSERT
    const { error: adjustError } = await supabase
      .from("leave_adjustments")
      .insert({
        balance_id: id,
        adjusted_by: session.userId,
        amount: adjustment,
        reason,
      });

    if (adjustError) {
      console.error("Error inserting leave adjustment:", adjustError);
      return NextResponse.json(
        { error: "Failed to record adjustment" },
        { status: 500 }
      );
    }

    // 2. 현재 adjusted 값을 읽고 계산
    const { data: current, error: fetchError } = await supabase
      .from("leave_balances")
      .select("adjusted")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      console.error("Error fetching current leave balance:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch current balance" },
        { status: 500 }
      );
    }

    const newAdjusted = (current.adjusted ?? 0) + adjustment;

    const { data, error: updateError } = await supabase
      .from("leave_balances")
      .update({ adjusted: newAdjusted })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating leave balance:", updateError);
      return NextResponse.json(
        { error: "Failed to update balance" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Leave balances PUT error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
