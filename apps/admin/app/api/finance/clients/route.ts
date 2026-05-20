import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, normalizeText, nullableText } from "../_utils";

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("finance:read");
    const supabase = createServiceClient();
    const status = request.nextUrl.searchParams.get("status");
    const keyword = request.nextUrl.searchParams.get("keyword")?.trim();

    let query = supabase
      .from("finance_clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (status === "active" || status === "inactive") query = query.eq("status", status);
    if (keyword) query = query.ilike("name", `%${keyword}%`);

    const { data, error } = await query;
    if (error) {
      console.error("Finance clients fetch error:", error);
      return NextResponse.json({ error: "고객사 조회 실패" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Finance clients API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminPermission("finance:write");
    const supabase = createServiceClient();
    const body = await request.json();
    const name = normalizeText(body.name);

    if (!name) {
      return NextResponse.json({ error: "고객사명을 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_clients")
      .insert({
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
      .select()
      .single();

    if (error) {
      console.error("Finance client create error:", error);
      return NextResponse.json({ error: "고객사 등록 실패" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Finance client create API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
