import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, calculateAmounts, normalizeText, nullableText, syncQuoteTotals, toInteger } from "../../../_utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();
    const name = normalizeText(body.name);

    if (!name) {
      return NextResponse.json({ error: "품목명을 입력해주세요." }, { status: 400 });
    }

    const amounts = calculateAmounts(body.quantity, body.unit_price);
    const { data, error } = await supabase
      .from("finance_quote_items")
      .insert({
        quote_id: id,
        name,
        description: nullableText(body.description),
        ...amounts,
        sort_order: toInteger(body.sort_order),
      })
      .select()
      .single();

    if (error) {
      console.error("Finance quote item create error:", error);
      return NextResponse.json({ error: "견적 품목 등록 실패" }, { status: 500 });
    }

    await syncQuoteTotals(supabase, id);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Finance quote item create API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
