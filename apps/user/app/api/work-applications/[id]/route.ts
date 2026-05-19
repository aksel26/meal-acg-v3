import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

type Action = "approve" | "reject";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "데이터베이스 연결 오류" }, { status: 500 });
    }

    const { id } = await params;
    const body = await request.json();
    const approverId = normalizeText(body.approverId);
    const action = normalizeText(body.action) as Action;
    const rejectReason = normalizeText(body.rejectReason);

    if (!approverId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "승인자와 처리 액션이 필요합니다." }, { status: 400 });
    }

    if (action === "reject" && !rejectReason) {
      return NextResponse.json({ error: "반려 사유를 입력해주세요." }, { status: 400 });
    }

    const { data: application, error: fetchError } = await supabase
      .from("work_applications")
      .select("id, requester_id, approver_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: "근무 신청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (application.requester_id === approverId) {
      return NextResponse.json({ error: "본인 신청은 직접 승인할 수 없습니다." }, { status: 403 });
    }

    if (application.approver_id !== approverId) {
      return NextResponse.json({ error: "승인 권한이 없습니다." }, { status: 403 });
    }

    if (application.status !== "pending") {
      return NextResponse.json({ error: "이미 처리된 신청입니다." }, { status: 400 });
    }

    const nextStatus = action === "approve" ? "approved" : "rejected";
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("work_applications")
      .update({
        status: nextStatus,
        approved_at: action === "approve" ? now : null,
        reject_reason: action === "reject" ? rejectReason : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Work application update error:", updateError);
      return NextResponse.json({ error: "근무 신청 처리 실패" }, { status: 500 });
    }

    await supabase
      .from("approval_requests")
      .update({
        status: nextStatus,
        reject_reason: action === "reject" ? rejectReason : null,
        resolved_at: now,
        resolved_by: approverId,
      })
      .eq("related_table", "work_applications")
      .eq("related_id", id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Work application update API error:", error);
    return NextResponse.json({ error: "근무 신청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
