import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { hasEffectiveAdminPermission } from "@/lib/rbac-server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptField } from "@/lib/hr-crypto";

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

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("id", id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("member_hr_profiles")
      .select(
        "resident_id_enc, account_enc, salary_enc, salary_effective_date, salary_note",
      )
      .eq("member_id", id)
      .maybeSingle();

    const canSalary = await hasEffectiveAdminPermission(
      session,
      "members:salary:read",
    );

    const residentId = decryptField(profile?.resident_id_enc ?? null);
    const accountRaw = decryptField(profile?.account_enc ?? null);
    const account = accountRaw
      ? (JSON.parse(accountRaw) as { bank: string; number: string })
      : null;

    const salaryPlain = canSalary
      ? decryptField(profile?.salary_enc ?? null)
      : null;
    const annualSalary = salaryPlain != null ? Number(salaryPlain) : null;

    const auditFields = ["resident_id", "account"];
    if (canSalary) auditFields.push("annual_salary");

    await writeAdminAuditLog({
      session,
      request,
      action: "member.sensitive_view",
      targetType: "member",
      targetId: id,
      targetLabel: member.full_name,
      riskLevel: "high",
      reason,
      metadata: { fields: auditFields },
    });

    return NextResponse.json({
      full_name: member.full_name,
      residentId,
      account,
      compensation: {
        annualSalary,
        currency: "KRW",
        effectiveDate: profile?.salary_effective_date ?? null,
        note: profile?.salary_note ?? null,
        registered: profile?.salary_enc != null,
        canView: canSalary,
      },
    });
  } catch (error) {
    console.error("Member sensitive API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
