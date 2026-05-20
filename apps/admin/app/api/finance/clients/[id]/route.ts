import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, normalizeText, nullableText } from "../../_utils";

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

    if (!name) {
      return NextResponse.json({ error: "고객사명을 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_clients")
      .update({
        name,
        business_registration_number: nullableText(body.business_registration_number),
        representative_name: nullableText(body.representative_name),
        contact_name: nullableText(body.contact_name),
        contact_phone: nullableText(body.contact_phone),
        contact_email: nullableText(body.contact_email),
        payment_terms: nullableText(body.payment_terms),
        status: body.status === "inactive" ? "inactive" : "active",
        memo: nullableText(body.memo),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Finance client update error:", error);
      return NextResponse.json({ error: "고객사 수정 실패" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Finance client update API error:", error);
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
      .from("finance_clients")
      .update({ status: "inactive" })
      .eq("id", id);

    if (error) {
      console.error("Finance client deactivate error:", error);
      return NextResponse.json({ error: "고객사 비활성화 실패" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Finance client delete API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
