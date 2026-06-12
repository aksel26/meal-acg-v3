import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import { decryptField } from "@/lib/hr-crypto";

function maskResident(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return "******";
  return `${digits.slice(0, 6)}-${digits[6]}******`;
}

function maskAccount(account: { bank: string; number: string } | null) {
  if (!account) return null;
  const n = account.number.replace(/\s/g, "");
  const tail = n.slice(-4);
  return { bank: account.bank, number: `****-**-**${tail}` };
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "데이터베이스 연결 오류" }, { status: 500 });
  }

  const reveal = request.nextUrl.searchParams.get("reveal") === "true";

  const { data: profile } = await supabase
    .from("member_hr_profiles")
    .select(
      "resident_id_enc, account_enc, salary_enc, salary_effective_date, salary_note",
    )
    .eq("member_id", user.id)
    .maybeSingle();

  const residentPlain = decryptField(profile?.resident_id_enc ?? null);
  const accountRaw = decryptField(profile?.account_enc ?? null);
  const accountPlain = accountRaw
    ? (JSON.parse(accountRaw) as { bank: string; number: string })
    : null;
  const salaryPlain = decryptField(profile?.salary_enc ?? null);

  if (reveal) {
    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      actor_name: user.fullName,
      action: "member.self_hr_view",
      target_type: "member",
      target_id: user.id,
      target_label: user.fullName,
      risk_level: "low",
      metadata: { fields: ["resident_id", "account", "annual_salary"] },
      request_path: request.nextUrl.pathname,
    });
  }

  return NextResponse.json({
    registered: profile != null,
    residentId: reveal ? residentPlain : maskResident(residentPlain),
    account: reveal ? accountPlain : maskAccount(accountPlain),
    annualSalary: reveal
      ? salaryPlain != null
        ? Number(salaryPlain)
        : null
      : null,
    salaryMasked: salaryPlain != null,
    salaryEffectiveDate: profile?.salary_effective_date ?? null,
    salaryNote: profile?.salary_note ?? null,
  });
}
