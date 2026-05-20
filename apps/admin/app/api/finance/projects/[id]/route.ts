import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, normalizeText, nullableId, nullableText, toInteger } from "../../_utils";

const PROJECT_STATUSES = ["draft", "active", "completed", "paused", "canceled"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();
    const name = normalizeText(body.name);
    const clientId = nullableId(body.client_id);

    if (!clientId || !name) {
      return NextResponse.json({ error: "고객사와 프로젝트명을 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_projects")
      .update({
        client_id: clientId,
        name,
        contract_start_date: nullableText(body.contract_start_date),
        contract_end_date: nullableText(body.contract_end_date),
        contract_amount: toInteger(body.contract_amount),
        owner_member_id: nullableId(body.owner_member_id),
        status: PROJECT_STATUSES.includes(body.status) ? body.status : "draft",
        memo: nullableText(body.memo),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Finance project update error:", error);
      return NextResponse.json({ error: "프로젝트 수정 실패" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Finance project update API error:", error);
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
      .from("finance_projects")
      .update({ status: "canceled" })
      .eq("id", id);

    if (error) {
      console.error("Finance project cancel error:", error);
      return NextResponse.json({ error: "프로젝트 취소 실패" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Finance project delete API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
