export const ADMIN_ROLES = ["대표", "팀장", "일반"] as const;
export const USER_AUTHORITIES = ["팀장/본부장", "팀장"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type UserAuthority = (typeof USER_AUTHORITIES)[number];

export const DEFAULT_ADMIN_ROLE: AdminRole = "일반";

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  대표: "슈퍼 관리자",
  팀장: "상위 관리자",
  일반: "일반 관리자",
};

export function getAdminRoleLabel(value: unknown) {
  return ADMIN_ROLE_LABELS[normalizeAdminRole(value)];
}

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
  "members:salary:read",
  "members:salary:write",
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
  "locker:read",
  "locker:write",
  "vehicle:read",
  "vehicle:write",
  "library:read",
  "library:write",
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

export const ADMIN_PERMISSION_GROUPS = [
  "직원/조직",
  "민감정보/다운로드",
  "복지포인트/식대",
  "근태/휴가",
  "자산/시설",
  "재무/평가",
  "설정/감사 로그",
] as const;

export type AdminPermissionGroup = (typeof ADMIN_PERMISSION_GROUPS)[number];

export type AdminPermissionMetadata = {
  permission: AdminPermission;
  label: string;
  group: AdminPermissionGroup;
  highRisk?: boolean;
};

export const ADMIN_PERMISSION_METADATA: AdminPermissionMetadata[] = [
  { permission: "dashboard:read", label: "대시보드 조회", group: "설정/감사 로그" },
  { permission: "meal:read", label: "식대 조회", group: "복지포인트/식대" },
  { permission: "meal:write", label: "식대 수정", group: "복지포인트/식대" },
  { permission: "meal:import", label: "식대 가져오기", group: "복지포인트/식대" },
  { permission: "meal:export", label: "식대 내보내기", group: "복지포인트/식대" },
  { permission: "points:read", label: "복지포인트 조회", group: "복지포인트/식대" },
  { permission: "points:write", label: "복지포인트 수정", group: "복지포인트/식대" },
  { permission: "points:review", label: "복지포인트 검토", group: "복지포인트/식대" },
  { permission: "organization:read", label: "조직 조회", group: "직원/조직" },
  { permission: "organization:write", label: "조직 수정", group: "직원/조직" },
  { permission: "members:read", label: "직원 조회", group: "직원/조직" },
  { permission: "members:write", label: "직원 수정", group: "직원/조직" },
  { permission: "members:sensitive:read", label: "직원 민감정보 조회", group: "민감정보/다운로드", highRisk: true },
  { permission: "members:sensitive:write", label: "직원 민감정보 수정", group: "민감정보/다운로드", highRisk: true },
  { permission: "members:salary:read", label: "직원 연봉 조회", group: "민감정보/다운로드", highRisk: true },
  { permission: "members:salary:write", label: "직원 연봉 수정", group: "민감정보/다운로드", highRisk: true },
  { permission: "rbac:manage", label: "권한 정책 관리", group: "설정/감사 로그", highRisk: true },
  { permission: "export:bulk", label: "대량 다운로드", group: "민감정보/다운로드", highRisk: true },
  { permission: "evaluation:read", label: "평가 조회", group: "재무/평가" },
  { permission: "evaluation:write", label: "평가 수정", group: "재무/평가" },
  { permission: "evaluation:deploy", label: "평가 배포", group: "재무/평가" },
  { permission: "attendance:read", label: "근태 조회", group: "근태/휴가" },
  { permission: "attendance:write", label: "근태 수정", group: "근태/휴가" },
  { permission: "leave:read", label: "휴가 조회", group: "근태/휴가" },
  { permission: "leave:write", label: "휴가 수정", group: "근태/휴가" },
  { permission: "leave:approve", label: "휴가 승인", group: "근태/휴가" },
  { permission: "locker:read", label: "사물함 조회", group: "자산/시설" },
  { permission: "locker:write", label: "사물함 관리", group: "자산/시설" },
  { permission: "vehicle:read", label: "차량 조회", group: "자산/시설" },
  { permission: "vehicle:write", label: "차량 관리", group: "자산/시설" },
  { permission: "library:read", label: "도서 조회", group: "자산/시설" },
  { permission: "library:write", label: "도서 관리", group: "자산/시설" },
  { permission: "notifications:read", label: "알림 조회", group: "설정/감사 로그" },
  { permission: "notifications:send", label: "알림 발송", group: "설정/감사 로그" },
  { permission: "finance:read", label: "재무 조회", group: "재무/평가" },
  { permission: "finance:write", label: "재무 수정", group: "재무/평가" },
  { permission: "finance:approve", label: "재무 승인", group: "재무/평가" },
  { permission: "finance:report", label: "재무 리포트", group: "재무/평가" },
  { permission: "audit:read", label: "감사 로그 조회", group: "설정/감사 로그", highRisk: true },
  { permission: "settings:read", label: "설정 조회", group: "설정/감사 로그" },
  { permission: "settings:write", label: "설정 수정", group: "설정/감사 로그" },
];

const REPRESENTATIVE_PERMISSIONS = ADMIN_PERMISSIONS;

const ADMIN_LEADER_PERMISSIONS: AdminPermission[] = ADMIN_PERMISSIONS.filter(
  (permission) =>
    permission !== "rbac:manage" &&
    permission !== "members:salary:read" &&
    permission !== "members:salary:write",
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
  "locker:read",
  "locker:write",
  "vehicle:read",
  "vehicle:write",
  "library:read",
  "library:write",
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

export const HIGH_RISK_PERMISSIONS: readonly AdminPermission[] =
  ADMIN_PERMISSION_METADATA.filter((meta) => meta.highRisk).map(
    (meta) => meta.permission,
  );

export function isHighRiskPermission(value: unknown): value is AdminPermission {
  return (
    isAdminPermission(value) &&
    HIGH_RISK_PERMISSIONS.includes(value as AdminPermission)
  );
}

export function isAdminPermission(value: unknown): value is AdminPermission {
  return (
    typeof value === "string" &&
    ADMIN_PERMISSIONS.includes(value as AdminPermission)
  );
}

export function getFallbackAdminPermissions(adminRole: unknown) {
  return ADMIN_ROLE_PERMISSIONS[normalizeAdminRole(adminRole)];
}

export function hasAdminPermission(
  adminRole: unknown,
  permission: AdminPermission,
) {
  return getFallbackAdminPermissions(adminRole).includes(permission);
}
