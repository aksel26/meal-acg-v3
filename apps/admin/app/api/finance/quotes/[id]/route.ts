import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, normalizeText, nullableId, nullableText } from "../../_utils";

const QUOTE_STATUSES = ["draft", "sent", "approved", "rejected", "expired"];

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
    const quoteNo = normalizeText(body.quote_no);

    if (!clientId || !quoteNo) {
      return NextResponse.json({ error: "고객사와 견적번호를 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_quotes")
      .update({
        client_id: clientId,
        project_id: nullableId(body.project_id),
        quote_no: quoteNo,
        quote_date: nullableText(body.quote_date),
        valid_until: nullableText(body.valid_until),
        status: QUOTE_STATUSES.includes(body.status) ? body.status : "draft",
        memo: nullableText(body.memo),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Finance quote update error:", error);
      return NextResponse.json({ error: "견적서 수정 실패" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Finance quote update API error:", error);
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
      .from("finance_quotes")
      .update({ status: "expired" })
      .eq("id", id);

    if (error) {
      console.error("Finance quote expire error:", error);
      return NextResponse.json({ error: "견적서 만료 처리 실패" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Finance quote delete API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
