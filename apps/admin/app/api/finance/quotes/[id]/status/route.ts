import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse, normalizeText } from "../../../_utils";

const QUOTE_STATUSES = ["draft", "sent", "approved", "rejected", "expired"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("finance:approve");
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();
    const status = normalizeText(body.status);

    if (!QUOTE_STATUSES.includes(status)) {
      return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("finance_quotes")
      .update({
        status,
        sent_at: status === "sent" ? now : undefined,
        approved_by: status === "approved" ? session.userId : null,
        approved_at: status === "approved" ? now : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Finance quote status error:", error);
      return NextResponse.json({ error: "견적서 상태 변경 실패" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Finance quote status API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
