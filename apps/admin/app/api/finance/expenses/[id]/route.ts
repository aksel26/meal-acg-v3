import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, normalizeText, nullableId, nullableText, toInteger } from "../../_utils";

const EXPENSE_STATUSES = ["draft", "submitted", "approved", "paid", "rejected"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();
    const projectId = nullableId(body.project_id);
    const expenseType = normalizeText(body.expense_type);

    if (!projectId || !expenseType) {
      return NextResponse.json({ error: "프로젝트와 비용 유형을 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_expense_records")
      .update({
        project_id: projectId,
        requester_id: nullableId(body.requester_id),
        expense_type: expenseType,
        used_at: nullableText(body.used_at),
        amount: toInteger(body.amount),
        description: normalizeText(body.description),
        status: EXPENSE_STATUSES.includes(body.status) ? body.status : "draft",
        reject_reason: nullableText(body.reject_reason),
        memo: nullableText(body.memo),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Finance expense update error:", error);
      return NextResponse.json({ error: "비용 정산 수정 실패" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Finance expense update API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const { id } = await params;
    const { error } = await supabase
      .from("finance_expense_records")
      .update({ status: "rejected", reject_reason: "삭제 처리" })
      .eq("id", id);

    if (error) {
      console.error("Finance expense reject error:", error);
      return NextResponse.json({ error: "비용 정산 삭제 실패" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Finance expense delete API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
