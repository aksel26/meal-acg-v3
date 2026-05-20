import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, nullableId, nullableText, toInteger } from "../_utils";

const REVENUE_STATUSES = ["expected", "invoiced", "paid", "overdue", "canceled"];
const TAX_STATUSES = ["none", "scheduled", "issued"];

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("finance:read");
    const supabase = createServiceClient();
    const status = request.nextUrl.searchParams.get("status");
    const month = request.nextUrl.searchParams.get("month");
    const clientId = request.nextUrl.searchParams.get("clientId");
    const projectId = request.nextUrl.searchParams.get("projectId");

    let query = supabase
      .from("finance_revenue_records")
      .select("*, client:finance_clients(id, name), project:finance_projects(id, name), quote:finance_quotes(id, quote_no)")
      .order("revenue_month", { ascending: false })
      .order("created_at", { ascending: false });

    if (REVENUE_STATUSES.includes(status || "")) query = query.eq("status", status);
    if (month) query = query.eq("revenue_month", month);
    if (clientId) query = query.eq("client_id", clientId);
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) {
      console.error("Finance revenue fetch error:", error);
      return NextResponse.json({ error: "매출 조회 실패" }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Finance revenue API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const body = await request.json();
    const clientId = nullableId(body.client_id);
    const revenueMonth = nullableText(body.revenue_month);

    if (!clientId || !revenueMonth) {
      return NextResponse.json({ error: "고객사와 매출월을 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_revenue_records")
      .insert({
        client_id: clientId,
        project_id: nullableId(body.project_id),
        quote_id: nullableId(body.quote_id),
        revenue_month: revenueMonth,
        revenue_date: nullableText(body.revenue_date),
        amount: toInteger(body.amount),
        tax_invoice_status: TAX_STATUSES.includes(body.tax_invoice_status) ? body.tax_invoice_status : "none",
        expected_payment_date: nullableText(body.expected_payment_date),
        paid_at: body.status === "paid" ? new Date().toISOString() : null,
        status: REVENUE_STATUSES.includes(body.status) ? body.status : "expected",
        memo: nullableText(body.memo),
      })
      .select()
      .single();

    if (error) {
      console.error("Finance revenue create error:", error);
      return NextResponse.json({ error: "매출 등록 실패" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Finance revenue create API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
