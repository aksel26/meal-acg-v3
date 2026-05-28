import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import {
  ADMIN_PERMISSIONS,
  getFallbackAdminPermissions,
  isAdminPermission,
  normalizeAdminRole,
  type AdminPermission,
} from "./rbac";

const PERMISSION_CACHE_TTL_MS = 30_000;

type PermissionCacheEntry = {
  expiresAt: number;
  permissions: readonly AdminPermission[];
};

type PermissionSubject = {
  userId: string;
  adminRole?: unknown;
};

type RolePolicyRow = {
  permission: string | null;
  enabled: boolean | null;
};

type MemberOverrideRow = {
  permission: string | null;
  effect: "allow" | "deny" | null;
};

const permissionCache = new Map<string, PermissionCacheEntry>();

function cacheKeyFor(subject: PermissionSubject) {
  return `${subject.userId}:${normalizeAdminRole(subject.adminRole)}`;
}

export function invalidateAdminPermissionCache() {
  permissionCache.clear();
}

export async function getEffectiveAdminPermissions(
  subject: PermissionSubject,
): Promise<readonly AdminPermission[]> {
  const adminRole = normalizeAdminRole(subject.adminRole);

  if (adminRole === "대표") {
    return ADMIN_PERMISSIONS;
  }

  const cacheKey = cacheKeyFor(subject);
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  try {
    const supabase = createServiceClient();
    const [{ data: policyRows, error: policyError }, { data: overrideRows, error: overrideError }] =
      await Promise.all([
        supabase
          .from("admin_role_permission_policies")
          .select("permission, enabled")
          .eq("admin_role", adminRole),
        supabase
          .from("admin_member_permission_overrides")
          .select("permission, effect")
          .eq("member_id", subject.userId),
      ]);

    if (policyError || overrideError) {
      throw policyError || overrideError;
    }

    const rolePermissions = new Set<AdminPermission>();
    for (const row of (policyRows ?? []) as RolePolicyRow[]) {
      if (row.enabled && isAdminPermission(row.permission)) {
        rolePermissions.add(row.permission);
      }
    }

    if (rolePermissions.size === 0) {
      return getFallbackAdminPermissions(adminRole);
    }

    for (const row of (overrideRows ?? []) as MemberOverrideRow[]) {
      if (!isAdminPermission(row.permission)) continue;

      if (row.effect === "allow") {
        rolePermissions.add(row.permission);
      }

      if (row.effect === "deny") {
        rolePermissions.delete(row.permission);
      }
    }

    const permissions = ADMIN_PERMISSIONS.filter((permission) =>
      rolePermissions.has(permission),
    );

    permissionCache.set(cacheKey, {
      expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS,
      permissions,
    });

    return permissions;
  } catch (error) {
    console.error("Failed to load admin permission policies:", error);
    return getFallbackAdminPermissions(adminRole);
  }
}

export async function hasEffectiveAdminPermission(
  subject: PermissionSubject,
  permission: AdminPermission,
) {
  const permissions = await getEffectiveAdminPermissions(subject);
  return permissions.includes(permission);
}
