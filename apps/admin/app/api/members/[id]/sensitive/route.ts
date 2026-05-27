import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { MEMBER_SENSITIVE_SELECT } from "@/lib/privacy";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("members:sensitive:read");
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason) {
      return NextResponse.json({ error: "사유를 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await (supabase.from("members") as any)
      .select(MEMBER_SENSITIVE_SELECT)
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
    }

    await writeAdminAuditLog({
      session,
      request,
      action: "member.sensitive_view",
      targetType: "member",
      targetId: id,
      targetLabel: data.full_name,
      riskLevel: "high",
      reason,
      metadata: {
        fields: ["birth_date", "phone", "passport_number"],
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Member sensitive API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
