import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, calculateAmounts, normalizeText, nullableText, syncQuoteTotals, toInteger } from "../../../../_utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const { id, itemId } = await params;
    const body = await request.json();
    const name = normalizeText(body.name);

    if (!name) {
      return NextResponse.json({ error: "품목명을 입력해주세요." }, { status: 400 });
    }

    const amounts = calculateAmounts(body.quantity, body.unit_price);
    const { data, error } = await supabase
      .from("finance_quote_items")
      .update({
        name,
        description: nullableText(body.description),
        ...amounts,
        sort_order: toInteger(body.sort_order),
      })
      .eq("id", itemId)
      .eq("quote_id", id)
      .select()
      .single();

    if (error) {
      console.error("Finance quote item update error:", error);
      return NextResponse.json({ error: "견적 품목 수정 실패" }, { status: 500 });
    }

    await syncQuoteTotals(supabase, id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Finance quote item update API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const { id, itemId } = await params;
    const { error } = await supabase
      .from("finance_quote_items")
      .delete()
      .eq("id", itemId)
      .eq("quote_id", id);

    if (error) {
      console.error("Finance quote item delete error:", error);
      return NextResponse.json({ error: "견적 품목 삭제 실패" }, { status: 500 });
    }

    await syncQuoteTotals(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Finance quote item delete API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
