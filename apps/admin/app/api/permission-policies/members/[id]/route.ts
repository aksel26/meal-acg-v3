import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { getAuthErrorStatus, requireRepresentativeAdmin } from "@/lib/auth";
import { invalidateAdminPermissionCache } from "@/lib/rbac-server";
import { isAdminPermission, type AdminPermission } from "@/lib/rbac";
import { createServiceClient } from "@/lib/supabase/server";

type PermissionOverrideEffect = "allow" | "deny";

type PermissionOverrideInput = {
  permission: AdminPermission;
  effect: PermissionOverrideEffect;
};

function normalizeOverrides(value: unknown): PermissionOverrideInput[] | null {
  if (!Array.isArray(value)) return null;

  const overrides = new Map<AdminPermission, PermissionOverrideEffect>();
  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      !("permission" in item) ||
      !("effect" in item)
    ) {
      return null;
    }

    const permission = item.permission;
    const effect = item.effect;
    if (!isAdminPermission(permission) || (effect !== "allow" && effect !== "deny")) {
      return null;
    }

    overrides.set(permission, effect);
  }

  return [...overrides].map(([permission, effect]) => ({ permission, effect }));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRepresentativeAdmin();
    const { id } = await params;
    const body = await request.json();
    const overrides = normalizeOverrides(body.overrides);

    if (!id || !overrides) {
      return NextResponse.json({ error: "잘못된 직원 권한 예외 요청입니다." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: member, error: memberError } = await (supabase.from("members") as any)
      .select("id, full_name, role, admin_role")
      .eq("id", id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
    }

    if (member.admin_role === "대표") {
      return NextResponse.json({ error: "대표 권한은 예외 설정할 수 없습니다." }, { status: 400 });
    }

    const { data: previousRows, error: previousError } = await (
      supabase.from("admin_member_permission_overrides") as any
    )
      .select("permission, effect")
      .eq("member_id", id);

    if (previousError) {
      console.error("Permission member override read error:", previousError);
      return NextResponse.json({ error: "기존 직원 권한 예외 조회 실패" }, { status: 500 });
    }

    const { error: deleteError } = await (
      supabase.from("admin_member_permission_overrides") as any
    )
      .delete()
      .eq("member_id", id);

    if (deleteError) {
      console.error("Permission member override delete error:", deleteError);
      return NextResponse.json({ error: "직원 권한 예외 저장 실패" }, { status: 500 });
    }

    if (overrides.length > 0) {
      const now = new Date().toISOString();
      const { error: insertError } = await (
        supabase.from("admin_member_permission_overrides") as any
      ).insert(
        overrides.map((override) => ({
          member_id: id,
          permission: override.permission,
          effect: override.effect,
          updated_at: now,
        })),
      );

      if (insertError) {
        console.error("Permission member override insert error:", insertError);
        return NextResponse.json({ error: "직원 권한 예외 저장 실패" }, { status: 500 });
      }
    }

    invalidateAdminPermissionCache();

    await writeAdminAuditLog({
      session,
      request,
      action: "permission.member_override_update",
      targetType: "member",
      targetId: id,
      targetLabel: member.full_name,
      riskLevel: "high",
      metadata: {
        memberId: id,
        memberName: member.full_name,
        before: previousRows || [],
        after: overrides,
      },
    });

    return NextResponse.json({
      memberId: id,
      overrides,
    });
  } catch (error) {
    console.error("Permission member override API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
