export const ADMIN_ROLES = ["대표", "팀장", "일반"] as const;
export const USER_AUTHORITIES = ["팀장/본부장", "팀장"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type UserAuthority = (typeof USER_AUTHORITIES)[number];

export const DEFAULT_ADMIN_ROLE: AdminRole = "일반";

export const ADMIN_PERMISSIONS = [
  "dashboard:read",
  "meal:read",
  "meal:write",
  "meal:import",
  "meal:export",
  "points:read",
  "points:write",
  "points:review",
  "organization:read",
  "organization:write",
  "members:read",
  "members:write",
  "members:sensitive:read",
  "members:sensitive:write",
  "rbac:manage",
  "export:bulk",
  "evaluation:read",
  "evaluation:write",
  "evaluation:deploy",
  "attendance:read",
  "attendance:write",
  "leave:read",
  "leave:write",
  "leave:approve",
  "notifications:read",
  "notifications:send",
  "finance:read",
  "finance:write",
  "finance:approve",
  "finance:report",
  "audit:read",
  "settings:read",
  "settings:write",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const REPRESENTATIVE_PERMISSIONS = ADMIN_PERMISSIONS;

const ADMIN_LEADER_PERMISSIONS: AdminPermission[] = ADMIN_PERMISSIONS.filter(
  (permission) => permission !== "rbac:manage",
);

const ADMIN_MEMBER_PERMISSIONS: AdminPermission[] = [
  "dashboard:read",
  "meal:read",
  "meal:write",
  "meal:import",
  "meal:export",
  "points:read",
  "points:review",
  "organization:read",
  "members:read",
  "evaluation:read",
  "attendance:read",
  "attendance:write",
  "leave:read",
  "leave:write",
  "notifications:read",
  "finance:read",
  "finance:write",
  "settings:read",
];

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  대표: REPRESENTATIVE_PERMISSIONS,
  팀장: ADMIN_LEADER_PERMISSIONS,
  일반: ADMIN_MEMBER_PERMISSIONS,
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && ADMIN_ROLES.includes(value as AdminRole);
}

export function isUserAuthority(value: unknown): value is UserAuthority {
  return (
    typeof value === "string" &&
    USER_AUTHORITIES.includes(value as UserAuthority)
  );
}

export function normalizeAdminRole(value: unknown): AdminRole {
  return isAdminRole(value) ? value : DEFAULT_ADMIN_ROLE;
}

export function hasAdminPermission(
  adminRole: unknown,
  permission: AdminPermission,
) {
  return ADMIN_ROLE_PERMISSIONS[normalizeAdminRole(adminRole)].includes(permission);
}
