import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, normalizeText, nullableId, nullableText } from "../_utils";

const QUOTE_STATUSES = ["draft", "sent", "approved", "rejected", "expired"];

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("finance:read");
    const supabase = createServiceClient();
    const status = request.nextUrl.searchParams.get("status");
    const clientId = request.nextUrl.searchParams.get("clientId");
    const projectId = request.nextUrl.searchParams.get("projectId");
    const keyword = request.nextUrl.searchParams.get("keyword")?.trim();

    let query = supabase
      .from("finance_quotes")
      .select("*, client:finance_clients(id, name), project:finance_projects(id, name), items:finance_quote_items(*)")
      .order("quote_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (QUOTE_STATUSES.includes(status || "")) query = query.eq("status", status);
    if (clientId) query = query.eq("client_id", clientId);
    if (projectId) query = query.eq("project_id", projectId);
    if (keyword) query = query.ilike("quote_no", `%${keyword}%`);

    const { data, error } = await query;
    if (error) {
      console.error("Finance quotes fetch error:", error);
      return NextResponse.json({ error: "견적서 조회 실패" }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Finance quotes API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const body = await request.json();
    const clientId = nullableId(body.client_id);
    const quoteNo = normalizeText(body.quote_no);

    if (!clientId || !quoteNo) {
      return NextResponse.json({ error: "고객사와 견적번호를 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_quotes")
      .insert({
        client_id: clientId,
        project_id: nullableId(body.project_id),
        quote_no: quoteNo,
        quote_date: nullableText(body.quote_date) || new Date().toISOString().slice(0, 10),
        valid_until: nullableText(body.valid_until),
        status: QUOTE_STATUSES.includes(body.status) ? body.status : "draft",
        memo: nullableText(body.memo),
      })
      .select()
      .single();

    if (error) {
      console.error("Finance quote create error:", error);
      return NextResponse.json({ error: "견적서 등록 실패" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Finance quote create API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
