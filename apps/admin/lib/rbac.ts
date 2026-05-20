export const ADMIN_ROLES = ["대표", "P&C 팀장", "P&C 일반"] as const;
export const USER_AUTHORITIES = ["팀장/본부장", "팀장"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type UserAuthority = (typeof USER_AUTHORITIES)[number];

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
  "members:write",
  "rbac:manage",
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
  "settings:read",
  "settings:write",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const REPRESENTATIVE_PERMISSIONS = ADMIN_PERMISSIONS;

const PNC_LEADER_PERMISSIONS: AdminPermission[] = ADMIN_PERMISSIONS.filter(
  (permission) => permission !== "rbac:manage",
);

const PNC_MEMBER_PERMISSIONS: AdminPermission[] = [
  "dashboard:read",
  "meal:read",
  "meal:write",
  "meal:import",
  "meal:export",
  "points:read",
  "points:review",
  "organization:read",
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
  "P&C 팀장": PNC_LEADER_PERMISSIONS,
  "P&C 일반": PNC_MEMBER_PERMISSIONS,
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
  return isAdminRole(value) ? value : "대표";
}

export function hasAdminPermission(
  adminRole: unknown,
  permission: AdminPermission,
) {
  return ADMIN_ROLE_PERMISSIONS[normalizeAdminRole(adminRole)].includes(permission);
}
