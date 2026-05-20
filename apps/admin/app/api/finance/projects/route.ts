import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, normalizeText, nullableId, nullableText, toInteger } from "../_utils";

const PROJECT_STATUSES = ["draft", "active", "completed", "paused", "canceled"];

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("finance:read");
    const supabase = createServiceClient();
    const status = request.nextUrl.searchParams.get("status");
    const clientId = request.nextUrl.searchParams.get("clientId");
    const keyword = request.nextUrl.searchParams.get("keyword")?.trim();

    let query = supabase
      .from("finance_projects")
      .select("*, client:finance_clients(id, name), owner:members!finance_projects_owner_member_id_fkey(id, full_name)")
      .order("created_at", { ascending: false });

    if (PROJECT_STATUSES.includes(status || "")) query = query.eq("status", status);
    if (clientId) query = query.eq("client_id", clientId);
    if (keyword) query = query.ilike("name", `%${keyword}%`);

    const { data, error } = await query;
    if (error) {
      console.error("Finance projects fetch error:", error);
      return NextResponse.json({ error: "프로젝트 조회 실패" }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Finance projects API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const body = await request.json();
    const name = normalizeText(body.name);
    const clientId = nullableId(body.client_id);

    if (!clientId || !name) {
      return NextResponse.json({ error: "고객사와 프로젝트명을 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_projects")
      .insert({
        client_id: clientId,
        name,
        contract_start_date: nullableText(body.contract_start_date),
        contract_end_date: nullableText(body.contract_end_date),
        contract_amount: toInteger(body.contract_amount),
        owner_member_id: nullableId(body.owner_member_id),
        status: PROJECT_STATUSES.includes(body.status) ? body.status : "draft",
        memo: nullableText(body.memo),
      })
      .select()
      .single();

    if (error) {
      console.error("Finance project create error:", error);
      return NextResponse.json({ error: "프로젝트 등록 실패" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Finance project create API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
