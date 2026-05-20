import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, normalizeText, nullableId, nullableText, toInteger } from "../_utils";

const EXPENSE_STATUSES = ["draft", "submitted", "approved", "paid", "rejected"];

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("finance:read");
    const supabase = createServiceClient();
    const status = request.nextUrl.searchParams.get("status");
    const projectId = request.nextUrl.searchParams.get("projectId");

    let query = supabase
      .from("finance_expense_records")
      .select("*, project:finance_projects(id, name, client:finance_clients(id, name)), requester:members!finance_expense_records_requester_id_fkey(id, full_name), approver:members!finance_expense_records_approved_by_fkey(id, full_name)")
      .order("used_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (EXPENSE_STATUSES.includes(status || "")) query = query.eq("status", status);
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) {
      console.error("Finance expenses fetch error:", error);
      return NextResponse.json({ error: "비용 정산 조회 실패" }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Finance expenses API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const body = await request.json();
    const projectId = nullableId(body.project_id);
    const expenseType = normalizeText(body.expense_type);
    const description = normalizeText(body.description);

    if (!projectId || !expenseType) {
      return NextResponse.json({ error: "프로젝트와 비용 유형을 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_expense_records")
      .insert({
        project_id: projectId,
        requester_id: nullableId(body.requester_id) || session.userId,
        expense_type: expenseType,
        used_at: nullableText(body.used_at) || new Date().toISOString().slice(0, 10),
        amount: toInteger(body.amount),
        description,
        status: EXPENSE_STATUSES.includes(body.status) ? body.status : "draft",
        memo: nullableText(body.memo),
      })
      .select()
      .single();

    if (error) {
      console.error("Finance expense create error:", error);
      return NextResponse.json({ error: "비용 정산 등록 실패" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Finance expense create API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
