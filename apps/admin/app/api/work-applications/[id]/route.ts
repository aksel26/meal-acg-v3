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
      return NextResponse.json(
        { error: "상태 값이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    if (status === "rejected" && !rejectReason) {
      return NextResponse.json(
        { error: "반려 사유를 입력해주세요." },
        { status: 400 },
      );
    }

    const { data: previousApplication, error: fetchError } = await supabase
      .from("work_applications")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !previousApplication) {
      return NextResponse.json(
        { error: "근무 신청을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .rpc("set_work_application_approval_status", {
        p_application_id: id,
        p_status: status,
        p_resolved_by: session.userId,
        p_reject_reason: rejectReason || undefined,
      })
      .single();

    if (updateError) {
      console.error("Admin work application update error:", updateError);
      return NextResponse.json(
        { error: "근무 신청 상태 변경 실패" },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin work application update API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
