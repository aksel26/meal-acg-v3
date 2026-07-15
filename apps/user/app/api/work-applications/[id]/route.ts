import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

type Action = "approve" | "reject";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PUT(
  request: NextRequest,
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
    const body = await request.json();
    // 승인자는 세션에서 강제 (아래 approver_id 일치 검사가 실제 권한 검증이 됨)
    const approverId = sessionUser.id;
    const action = normalizeText(body.action) as Action;
    const rejectReason = normalizeText(body.rejectReason);

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "처리 액션이 필요합니다." },
        { status: 400 },
      );
    }

    if (action === "reject" && !rejectReason) {
      return NextResponse.json(
        { error: "반려 사유를 입력해주세요." },
        { status: 400 },
      );
    }

    const { data: approval, error: fetchError } = await supabase
      .from("approval_requests")
      .select("id")
      .eq("related_table", "work_applications")
      .eq("related_id", id)
      .eq("approver_id", approverId)
      .eq("status", "pending")
      .single();

    if (fetchError || !approval) {
      return NextResponse.json(
        { error: "승인 권한이 없습니다." },
        { status: 403 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .rpc("resolve_work_application_approval", {
        p_approval_id: approval.id,
        p_approver_id: approverId,
        p_action: action,
        p_reject_reason: rejectReason || undefined,
      })
      .single();

    if (updateError) {
      console.error("Work application update error:", updateError);
      return NextResponse.json(
        { error: "근무 신청 처리 실패" },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Work application update API error:", error);
    return NextResponse.json(
      { error: "근무 신청 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
