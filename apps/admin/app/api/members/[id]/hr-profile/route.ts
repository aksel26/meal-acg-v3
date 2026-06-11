import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import {
  AuthError,
  getAuthErrorStatus,
  requireAdminPermission,
} from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { encryptField } from "@/lib/hr-crypto";

type Body = {
  residentId?: string | null;
  account?: { bank: string; number: string } | null;
  salary?: number | string | null;
  salaryEffectiveDate?: string | null;
  salaryNote?: string | null;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const { id } = await params;

    const touchesSensitive = "residentId" in body || "account" in body;
    const touchesSalary =
      "salary" in body ||
      "salaryEffectiveDate" in body ||
      "salaryNote" in body;

    if (!touchesSensitive && !touchesSalary) {
      return NextResponse.json({ error: "수정할 필드가 없습니다." }, { status: 400 });
    }

    // 필드별 권한 가드 (둘 다 건드리면 둘 다 필요)
    let session = touchesSensitive
      ? await requireAdminPermission("members:sensitive:write")
      : await requireAdminPermission("members:salary:write");
    if (touchesSensitive && touchesSalary) {
      session = await requireAdminPermission("members:salary:write");
    }

    const supabase = createServiceClient();

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("id", id)
      .single();
    if (memberError || !member) {
      return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
    }

    const update: Record<string, string | null> = {
      member_id: id,
      updated_by: session.userId,
    };
    const changed: string[] = [];

    if ("residentId" in body) {
      const v = body.residentId?.trim();
      update.resident_id_enc = v ? encryptField(v) : null;
      changed.push("resident_id");
    }
    if ("account" in body) {
      const a = body.account;
      update.account_enc = a
        ? encryptField(JSON.stringify({ bank: a.bank, number: a.number }))
        : null;
      changed.push("account");
    }
    if ("salary" in body) {
      const s = body.salary;
      update.salary_enc =
        s != null && `${s}` !== "" ? encryptField(`${s}`) : null;
      changed.push("annual_salary");
    }
    if ("salaryEffectiveDate" in body) {
      update.salary_effective_date = body.salaryEffectiveDate || null;
      changed.push("salary_effective_date");
    }
    if ("salaryNote" in body) {
      update.salary_note = body.salaryNote || null;
      changed.push("salary_note");
    }

    const { error: upsertError } = await supabase
      .from("member_hr_profiles")
      .upsert(update, { onConflict: "member_id" });
    if (upsertError) {
      console.error("hr-profile upsert error:", upsertError);
      return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
    }

    await writeAdminAuditLog({
      session,
      request,
      action: "member.hr_update",
      targetType: "member",
      targetId: id,
      targetLabel: member.full_name,
      riskLevel: "high",
      metadata: { fields: changed },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("hr-profile PUT error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
