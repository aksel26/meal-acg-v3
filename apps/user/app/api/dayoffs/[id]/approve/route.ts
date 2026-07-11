import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// PATCH /api/dayoffs/[id]/approve - 근태 승인
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 승인자는 로그인 세션 본인으로 강제한다 (요청 body의 approverId 위조 차단)
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const approverId = sessionUser.id;

    const { data, error } = await supabase
      .from("dayoffs")
      .update({
        approver_id: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("is_deleted", false)
      .is("approver_id", null)
      .select(
        `
        *,
        approver:members!dayoffs_approver_id_fkey(id, full_name)
      `
      )
      .single();

    if (error) {
      console.error("Error approving dayoff:", error);
      return NextResponse.json(
        { error: "Failed to approve dayoff (already approved or not found)" },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs approve API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
