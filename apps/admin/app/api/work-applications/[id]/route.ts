import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("attendance:write");
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();
    const status = normalizeText(body.status);
    const rejectReason = normalizeText(body.rejectReason);

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
    }

    if (status === "rejected" && !rejectReason) {
      return NextResponse.json({ error: "반려 사유를 입력해주세요." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("work_applications")
      .update({
        status,
        approver_id: status === "pending" ? null : session.userId,
        approved_at: status === "approved" ? now : null,
        reject_reason: status === "rejected" ? rejectReason : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Admin work application update error:", updateError);
      return NextResponse.json({ error: "근무 신청 상태 변경 실패" }, { status: 500 });
    }

    await supabase
      .from("approval_requests")
      .update({
        status,
        reject_reason: status === "rejected" ? rejectReason : null,
        resolved_at: status === "pending" ? null : now,
        resolved_by: status === "pending" ? null : session.userId,
      })
      .eq("related_table", "work_applications")
      .eq("related_id", id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin work application update API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
