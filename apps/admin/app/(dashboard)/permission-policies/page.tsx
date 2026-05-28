"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent } from "@repo/ui/src/card";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Input } from "@repo/ui/src/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/src/tabs";
import { toast } from "@repo/ui/src/sonner";
import {
  ADMIN_ROLES,
  type AdminPermission,
  type AdminPermissionGroup,
  type AdminPermissionMetadata,
  type AdminRole,
} from "@/lib/rbac";

type RolePolicyRow = {
  admin_role: AdminRole;
  permission: AdminPermission;
  enabled: boolean;
};

type AdminMember = {
  id: string;
  full_name: string;
  role: "admin";
  admin_role: AdminRole | null;
};

type MemberOverride = {
  member_id: string;
  permission: AdminPermission;
  effect: "allow" | "deny";
  member?: {
    id: string;
    full_name: string;
    admin_role: AdminRole | null;
  } | null;
};

type PermissionAuditLog = {
  id: string;
  actor_name: string | null;
  action: string;
  target_label: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type PermissionPoliciesResponse = {
  permissions: AdminPermissionMetadata[];
  groups: AdminPermissionGroup[];
  rolePolicies: RolePolicyRow[];
  memberOverrides: MemberOverride[];
  adminMembers: AdminMember[];
  auditLogs: PermissionAuditLog[];
};

type OverrideValue = "inherit" | "allow" | "deny";

async function fetchPermissionPolicies(): Promise<PermissionPoliciesResponse> {
  const response = await fetch("/api/permission-policies");
  if (!response.ok) throw new Error("권한 정책 조회 실패");
  return response.json();
}

function createRolePolicyMap(data?: PermissionPoliciesResponse) {
  const roleMap = new Map<AdminRole, Set<AdminPermission>>();
  ADMIN_ROLES.forEach((role) => roleMap.set(role, new Set()));

  for (const row of data?.rolePolicies || []) {
    if (row.enabled) roleMap.get(row.admin_role)?.add(row.permission);
  }

  return roleMap;
}

function createMemberOverrideMap(data?: PermissionPoliciesResponse) {
  const overrideMap = new Map<string, Map<AdminPermission, OverrideValue>>();

  for (const row of data?.memberOverrides || []) {
    const memberMap = overrideMap.get(row.member_id) ?? new Map();
    memberMap.set(row.permission, row.effect);
    overrideMap.set(row.member_id, memberMap);
  }

  return overrideMap;
}

function groupPermissions(
  permissions: AdminPermissionMetadata[],
  groups: AdminPermissionGroup[],
) {
  return groups.map((group) => ({
    group,
    permissions: permissions.filter((permission) => permission.group === group),
  }));
}

export default function PermissionPoliciesPage() {
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState<AdminRole>("대표");
  const [roleDrafts, setRoleDrafts] = useState<Map<AdminRole, Set<AdminPermission>>>(
    () => new Map(),
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [overrideDraft, setOverrideDraft] = useState<Map<AdminPermission, OverrideValue>>(
    () => new Map(),
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["permission-policies"],
    queryFn: fetchPermissionPolicies,
  });

  const rolePolicyMap = useMemo(() => createRolePolicyMap(data), [data]);
  const memberOverrideMap = useMemo(() => createMemberOverrideMap(data), [data]);
  const groupedPermissions = useMemo(
    () => groupPermissions(data?.permissions || [], data?.groups || []),
    [data],
  );

  const selectedMember = data?.adminMembers.find((member) => member.id === selectedMemberId);
  const selectedMemberRole = selectedMember?.admin_role || "일반";
  const selectedMemberIsRepresentative = selectedMember?.admin_role === "대표";

  const filteredMembers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    const members = data?.adminMembers || [];
    if (!keyword) return members;
    return members.filter((member) =>
      `${member.full_name} ${member.admin_role || ""}`.toLowerCase().includes(keyword),
    );
  }, [data, memberSearch]);

  useEffect(() => {
    if (!data) return;
    setRoleDrafts(createRolePolicyMap(data));
    if (!selectedMemberId && data.adminMembers[0]) {
      setSelectedMemberId(data.adminMembers[0].id);
    }
  }, [data, selectedMemberId]);

  useEffect(() => {
    if (!selectedMemberId) return;
    setOverrideDraft(new Map(memberOverrideMap.get(selectedMemberId) || []));
  }, [memberOverrideMap, selectedMemberId]);

  const saveRoleMutation = useMutation({
    mutationFn: async (adminRole: AdminRole) => {
      const permissions = [...(roleDrafts.get(adminRole) || [])];
      const response = await fetch("/api/permission-policies/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminRole, permissions }),
      });
      if (!response.ok) throw new Error("역할 권한 저장 실패");
      return response.json();
    },
    onSuccess: async () => {
      toast.success("역할 권한을 저장했습니다.");
      await queryClient.invalidateQueries({ queryKey: ["permission-policies"] });
    },
    onError: () => toast.error("역할 권한 저장에 실패했습니다."),
  });

  const saveMemberMutation = useMutation({
    mutationFn: async () => {
      const overrides = [...overrideDraft.entries()]
        .filter(([, effect]) => effect !== "inherit")
        .map(([permission, effect]) => ({ permission, effect }));
      const response = await fetch(`/api/permission-policies/members/${selectedMemberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });
      if (!response.ok) throw new Error("직원 권한 예외 저장 실패");
      return response.json();
    },
    onSuccess: async () => {
      toast.success("직원 권한 예외를 저장했습니다.");
      await queryClient.invalidateQueries({ queryKey: ["permission-policies"] });
    },
    onError: () => toast.error("직원 권한 예외 저장에 실패했습니다."),
  });

  function updateRolePermission(
    role: AdminRole,
    permission: AdminPermission,
    checked: boolean,
  ) {
    if (role === "대표") return;
    setRoleDrafts((current) => {
      const next = new Map(current);
      const permissions = new Set(next.get(role) || []);
      if (checked) permissions.add(permission);
      else permissions.delete(permission);
      next.set(role, permissions);
      return next;
    });
  }

  function setOverride(permission: AdminPermission, effect: OverrideValue) {
    setOverrideDraft((current) => {
      const next = new Map(current);
      if (effect === "inherit") next.delete(permission);
      else next.set(permission, effect);
      return next;
    });
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">권한 정책을 불러오는 중입니다.</div>;
  }

  if (error || !data) {
    return <div className="p-6 text-sm text-red-600">권한 정책을 불러오지 못했습니다.</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 py-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
        <Card className="rounded-lg border-slate-200 shadow-none">
          <CardContent className="p-5">
            <Tabs value={activeRole} onValueChange={(value) => setActiveRole(value as AdminRole)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  {ADMIN_ROLES.map((role) => (
                    <TabsTrigger key={role} value={role}>
                      {role}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Button
                  disabled={activeRole === "대표" || saveRoleMutation.isPending}
                  onClick={() => saveRoleMutation.mutate(activeRole)}
                >
                  {saveRoleMutation.isPending ? "저장 중" : "역할 권한 저장"}
                </Button>
              </div>

              {ADMIN_ROLES.map((role) => (
                <TabsContent key={role} value={role} className="mt-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant={role === "대표" ? "default" : "secondary"}>
                      {role === "대표" ? "전체 권한 고정" : "수정 가능"}
                    </Badge>
                    {role === "대표" && (
                      <span className="text-sm text-slate-500">
                        대표 권한은 잠김 방지를 위해 변경할 수 없습니다.
                      </span>
                    )}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {groupedPermissions.map(({ group, permissions }) => (
                      <div key={group} className="rounded-lg border border-slate-200 p-4">
                        <h3 className="mb-3 text-sm font-semibold text-slate-900">{group}</h3>
                        <div className="space-y-3">
                          {permissions.map((item) => {
                            const checked =
                              role === "대표" ||
                              Boolean(roleDrafts.get(role)?.has(item.permission));
                            return (
                              <label
                                key={item.permission}
                                className="flex items-start gap-3 text-sm"
                              >
                                <Checkbox
                                  className="mt-0.5"
                                  checked={checked}
                                  disabled={role === "대표"}
                                  onCheckedChange={(value) =>
                                    updateRolePermission(role, item.permission, value === true)
                                  }
                                />
                                <span className="flex flex-col gap-1">
                                  <span className="flex items-center gap-2 font-medium text-slate-800">
                                    {item.label}
                                    {item.highRisk && (
                                      <Badge variant="destructive" className="text-[10px]">
                                        고위험
                                      </Badge>
                                    )}
                                  </span>
                                  <span className="text-xs text-slate-500">{item.permission}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 shadow-none">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">직원별 예외 권한</h2>
                <p className="text-sm text-slate-500">역할 기본값 위에 추가/차단을 적용합니다.</p>
              </div>
              <Button
                disabled={!selectedMember || selectedMemberIsRepresentative || saveMemberMutation.isPending}
                onClick={() => saveMemberMutation.mutate()}
              >
                {saveMemberMutation.isPending ? "저장 중" : "예외 저장"}
              </Button>
            </div>

            <Input
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="관리자 이름 검색"
              className="mb-3"
            />

            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="직원 선택" />
              </SelectTrigger>
              <SelectContent>
                {filteredMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name} · {member.admin_role || "일반"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedMember && (
              <div className="mt-4 rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedMember.full_name}
                    </p>
                    <p className="text-xs text-slate-500">역할: {selectedMemberRole}</p>
                  </div>
                  {selectedMemberIsRepresentative && (
                    <Badge variant="default">대표 예외 설정 불가</Badge>
                  )}
                </div>

                <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
                  {data.permissions.map((item) => {
                    const inherited = selectedMemberRole === "대표" ||
                      Boolean(rolePolicyMap.get(selectedMemberRole)?.has(item.permission));
                    const override = overrideDraft.get(item.permission) || "inherit";
                    return (
                      <div
                        key={item.permission}
                        className="grid gap-2 rounded-md border border-slate-100 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-800">{item.label}</span>
                          <Badge variant={inherited ? "secondary" : "outline"}>
                            {inherited ? "역할 기본 허용" : "권한 없음"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">{item.permission}</span>
                          <Select
                            value={override}
                            disabled={selectedMemberIsRepresentative}
                            onValueChange={(value) =>
                              setOverride(item.permission, value as OverrideValue)
                            }
                          >
                            <SelectTrigger className="h-8 w-[132px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">역할 따름</SelectItem>
                              <SelectItem value="allow">추가 허용</SelectItem>
                              <SelectItem value="deny">개인 차단</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-lg border-slate-200 shadow-none">
        <CardContent className="p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">최근 권한 변경 이력</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">시각</th>
                  <th className="px-4 py-3 font-medium">작업자</th>
                  <th className="px-4 py-3 font-medium">대상</th>
                  <th className="px-4 py-3 font-medium">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      권한 변경 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(log.created_at).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-slate-900">{log.actor_name || "-"}</td>
                      <td className="px-4 py-3 text-slate-900">{log.target_label || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{log.action}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
