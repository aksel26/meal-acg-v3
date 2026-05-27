import type { NextRequest } from "next/server";
import type { AuthSession } from "@/lib/supabase/types";
import { createServiceClient } from "@/lib/supabase/server";

export type AdminAuditRiskLevel = "low" | "medium" | "high";

type WriteAdminAuditLogInput = {
  session: AuthSession;
  request?: NextRequest;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  riskLevel?: AdminAuditRiskLevel;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAdminAuditLog({
  session,
  request,
  action,
  targetType,
  targetId,
  targetLabel,
  riskLevel = "medium",
  reason,
  metadata = {},
}: WriteAdminAuditLogInput) {
  const supabase = createServiceClient();
  const forwardedFor = request?.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || request?.headers.get("x-real-ip");
  const userAgent = request?.headers.get("user-agent");

  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_id: session.userId,
    actor_name: session.fullName,
    action,
    target_type: targetType,
    target_id: targetId || null,
    target_label: targetLabel || null,
    risk_level: riskLevel,
    reason: reason || null,
    metadata,
    request_path: request?.nextUrl.pathname || null,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });

  if (error) {
    console.error("Admin audit log write failed:", error);
    throw new Error("감사 로그 기록에 실패했습니다.");
  }
}
