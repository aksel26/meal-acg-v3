import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, nullableId, nullableText, toInteger } from "../../_utils";

const REVENUE_STATUSES = ["expected", "invoiced", "paid", "overdue", "canceled"];
const TAX_STATUSES = ["none", "scheduled", "issued"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();
    const clientId = nullableId(body.client_id);
    const revenueMonth = nullableText(body.revenue_month);
    const status = REVENUE_STATUSES.includes(body.status) ? body.status : "expected";

    if (!clientId || !revenueMonth) {
      return NextResponse.json({ error: "고객사와 매출월을 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_revenue_records")
      .update({
        client_id: clientId,
        project_id: nullableId(body.project_id),
        quote_id: nullableId(body.quote_id),
        revenue_month: revenueMonth,
        revenue_date: nullableText(body.revenue_date),
        amount: toInteger(body.amount),
        tax_invoice_status: TAX_STATUSES.includes(body.tax_invoice_status) ? body.tax_invoice_status : "none",
        expected_payment_date: nullableText(body.expected_payment_date),
        paid_at: status === "paid" ? new Date().toISOString() : null,
        status,
        memo: nullableText(body.memo),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Finance revenue update error:", error);
      return NextResponse.json({ error: "매출 수정 실패" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Finance revenue update API error:", error);
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
      .from("finance_revenue_records")
      .update({ status: "canceled" })
      .eq("id", id);

    if (error) {
      console.error("Finance revenue cancel error:", error);
      return NextResponse.json({ error: "매출 취소 실패" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Finance revenue delete API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
