import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";

// PATCH /api/dayoffs/[id]/approve - 지정 승인자의 공식 결재 요청을 승인
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const { id } = await params;
    const { data: approval, error: approvalError } = await supabase
      .from("approval_requests")
      .select("id")
      .eq("related_table", "dayoffs")
      .eq("related_id", id)
      .eq("approver_id", sessionUser.id)
      .eq("status", "pending")
      .single();

    if (approvalError || !approval) {
      return NextResponse.json(
        { error: "승인 요청을 찾을 수 없거나 권한이 없습니다." },
        { status: 403 },
      );
    }

    const { error: resolveError } = await supabase
      .rpc("resolve_leave_approval_atomic", {
        p_approval_id: approval.id,
        p_actor_id: sessionUser.id,
        p_action: "approve",
        p_require_assigned_approver: true,
        p_reject_reason: null,
      })
      .single();

    if (resolveError) {
      console.error("Atomic dayoff approval failed:", resolveError);
      return NextResponse.json(
        { error: "휴가 승인 처리에 실패했습니다." },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("dayoffs")
      .select(
        `
        *,
        approver:members!dayoffs_approver_id_fkey(id, full_name)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "승인된 휴가 조회에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs approve API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
