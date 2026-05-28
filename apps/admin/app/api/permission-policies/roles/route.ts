import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { getAuthErrorStatus, requireRepresentativeAdmin } from "@/lib/auth";
import { invalidateAdminPermissionCache } from "@/lib/rbac-server";
import {
  ADMIN_PERMISSIONS,
  isAdminPermission,
  type AdminPermission,
  type AdminRole,
} from "@/lib/rbac";
import { createServiceClient } from "@/lib/supabase/server";

const EDITABLE_ADMIN_ROLES = ["팀장", "일반"] as const;

function isEditableAdminRole(value: unknown): value is Extract<AdminRole, "팀장" | "일반"> {
  return (
    typeof value === "string" &&
    EDITABLE_ADMIN_ROLES.includes(value as Extract<AdminRole, "팀장" | "일반">)
  );
}

function normalizePermissionList(value: unknown): AdminPermission[] | null {
  if (!Array.isArray(value)) return null;

  const permissions = new Set<AdminPermission>();
  for (const item of value) {
    if (!isAdminPermission(item)) return null;
    permissions.add(item);
  }

  return ADMIN_PERMISSIONS.filter((permission) => permissions.has(permission));
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRepresentativeAdmin();
    const body = await request.json();
    const adminRole = body.adminRole;
    const permissions = normalizePermissionList(body.permissions);

    if (!isEditableAdminRole(adminRole) || !permissions) {
      return NextResponse.json({ error: "잘못된 권한 정책 요청입니다." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: previousRows, error: previousError } = await (
      supabase.from("admin_role_permission_policies") as any
    )
      .select("permission, enabled")
      .eq("admin_role", adminRole);

    if (previousError) {
      console.error("Permission role policy read error:", previousError);
      return NextResponse.json({ error: "기존 권한 정책 조회 실패" }, { status: 500 });
    }

    const enabledPermissions = new Set(permissions);
    const rows = ADMIN_PERMISSIONS.map((permission) => ({
      admin_role: adminRole,
      permission,
      enabled: enabledPermissions.has(permission),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await (supabase.from("admin_role_permission_policies") as any)
      .upsert(rows, { onConflict: "admin_role,permission" });

    if (error) {
      console.error("Permission role policy update error:", error);
      return NextResponse.json({ error: "권한 정책 저장 실패" }, { status: 500 });
    }

    invalidateAdminPermissionCache();

    await writeAdminAuditLog({
      session,
      request,
      action: "permission.role_policy_update",
      targetType: "admin_role",
      targetId: adminRole,
      targetLabel: adminRole,
      riskLevel: "high",
      metadata: {
        adminRole,
        before: previousRows || [],
        after: rows.map(({ permission, enabled }) => ({ permission, enabled })),
      },
    });

    return NextResponse.json({
      adminRole,
      permissions,
    });
  } catch (error) {
    console.error("Permission role policy API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
