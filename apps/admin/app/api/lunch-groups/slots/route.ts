import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { authErrorResponse, logLunchGroupAction } from "@/lib/lunch-group-audit";

// PATCH: 출발 조의 빈 자리 1칸을 도착 조로 넘긴다 (max_slots -1 / +1)
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { weekStartDate, fromGroupNumber, toGroupNumber } = body as {
      weekStartDate: string;
      fromGroupNumber: number;
      toGroupNumber: number;
    };

    if (
      !weekStartDate ||
      typeof fromGroupNumber !== "number" ||
      typeof toGroupNumber !== "number" ||
      fromGroupNumber === toGroupNumber
    ) {
      return NextResponse.json(
        { error: "weekStartDate, fromGroupNumber, toGroupNumber가 필요합니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data: groups, error: fetchError } = await supabase
      .from("lunch_groups")
      .select("id, group_number, max_slots, lunch_group_members(id)")
      .eq("week_start_date", weekStartDate)
      .in("group_number", [fromGroupNumber, toGroupNumber]);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const from = groups?.find((g) => g.group_number === fromGroupNumber);
    const to = groups?.find((g) => g.group_number === toGroupNumber);
    if (!from || !to) {
      return NextResponse.json({ error: "조를 찾을 수 없습니다." }, { status: 404 });
    }

    const fromMax = from.max_slots ?? 4;
    const fromCount = (from.lunch_group_members as { id: string }[] | null)?.length ?? 0;
    if (fromMax <= 1) {
      return NextResponse.json(
        { error: "조에는 최소 1자리가 필요합니다." },
        { status: 400 },
      );
    }
    if (fromCount >= fromMax) {
      return NextResponse.json(
        { error: `${fromGroupNumber}조에 옮길 빈 자리가 없습니다.` },
        { status: 400 },
      );
    }

    // 두 UPDATE가 한 트랜잭션은 아니다. 두 번째가 실패하면 자리 1칸이 줄어든 채 남지만
    // 화면에서 바로 보이고 빈 자리 드래그로 되돌릴 수 있다.
    const { error: decError } = await supabase
      .from("lunch_groups")
      .update({ max_slots: fromMax - 1 })
      .eq("id", from.id);
    if (decError) {
      return NextResponse.json({ error: decError.message }, { status: 500 });
    }

    const { error: incError } = await supabase
      .from("lunch_groups")
      .update({ max_slots: (to.max_slots ?? 4) + 1 })
      .eq("id", to.id);
    if (incError) {
      return NextResponse.json({ error: incError.message }, { status: 500 });
    }

    await logLunchGroupAction({
      weekStartDate,
      action: "move_slot",
      changedBy: session.userId,
      fromGroupNumber,
      toGroupNumber,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Lunch group slot API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
