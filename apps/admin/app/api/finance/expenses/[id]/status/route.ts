import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, normalizeText, nullableText } from "../../../_utils";

const EXPENSE_STATUSES = ["draft", "submitted", "approved", "paid", "rejected"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("finance:approve");
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();
    const status = normalizeText(body.status);
    const rejectReason = nullableText(body.reject_reason);

    if (!EXPENSE_STATUSES.includes(status)) {
      return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
    }
    if (status === "rejected" && !rejectReason) {
      return NextResponse.json({ error: "반려 사유를 입력해주세요." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("finance_expense_records")
      .update({
        status,
        approved_by: status === "approved" || status === "paid" ? session.userId : null,
        approved_at: status === "approved" || status === "paid" ? now : null,
        paid_at: status === "paid" ? now : null,
        reject_reason: status === "rejected" ? rejectReason : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Finance expense status error:", error);
      return NextResponse.json({ error: "비용 정산 상태 변경 실패" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Finance expense status API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
