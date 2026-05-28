import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireRepresentativeAdmin } from "@/lib/auth";
import {
  ADMIN_PERMISSION_GROUPS,
  ADMIN_PERMISSION_METADATA,
  ADMIN_PERMISSIONS,
} from "@/lib/rbac";
import { createServiceClient } from "@/lib/supabase/server";

const PERMISSION_AUDIT_ACTIONS = [
  "permission.role_policy_update",
  "permission.member_override_update",
];

export async function GET() {
  try {
    await requireRepresentativeAdmin();
    const supabase = createServiceClient();

    const [
      rolePoliciesResult,
      memberOverridesResult,
      adminMembersResult,
      auditLogsResult,
    ] = await Promise.all([
      (supabase.from("admin_role_permission_policies") as any)
        .select("admin_role, permission, enabled")
        .order("admin_role", { ascending: true })
        .order("permission", { ascending: true }),
      (supabase.from("admin_member_permission_overrides") as any)
        .select("member_id, permission, effect, member:members(id, full_name, admin_role)")
        .order("member_id", { ascending: true })
        .order("permission", { ascending: true }),
      (supabase.from("members") as any)
        .select("id, full_name, role, admin_role")
        .eq("role", "admin")
        .order("full_name", { ascending: true }),
      (supabase.from("admin_audit_logs") as any)
        .select("id, actor_name, action, target_type, target_id, target_label, metadata, created_at")
        .in("action", PERMISSION_AUDIT_ACTIONS)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const error =
      rolePoliciesResult.error ||
      memberOverridesResult.error ||
      adminMembersResult.error ||
      auditLogsResult.error;

    if (error) {
      console.error("Permission policies API error:", error);
      return NextResponse.json({ error: "권한 정책 조회 실패" }, { status: 500 });
    }

    return NextResponse.json({
      permissions: ADMIN_PERMISSION_METADATA,
      permissionKeys: ADMIN_PERMISSIONS,
      groups: ADMIN_PERMISSION_GROUPS,
      rolePolicies: rolePoliciesResult.data || [],
      memberOverrides: memberOverridesResult.data || [],
      adminMembers: adminMembersResult.data || [],
      auditLogs: auditLogsResult.data || [],
    });
  } catch (error) {
    console.error("Permission policies API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
