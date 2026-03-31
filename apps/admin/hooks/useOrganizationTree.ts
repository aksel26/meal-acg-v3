"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface OrgMember {
  id: string;
  full_name: string;
  member_role: "본부장" | "팀장" | "팀원" | "인턴";
  email: string | null;
  team_id: string | null;
  division_id: string | null;
  intern_months?: number | null;
  position?: { id: string; name: string } | null;
  title?: { id: string; name: string } | null;
}

export interface OrgTeam {
  id: string;
  name: string;
  organization_id: string;
  division_id: string | null;
  created_at: string | null;
  members: OrgMember[];
}

export interface OrgDivision {
  id: string;
  name: string;
  organization_id: string;
  created_at: string | null;
  teams: OrgTeam[];
}

export interface OrganizationTree {
  id: string;
  name: string;
  created_at: string | null;
  divisions: OrgDivision[];
  teams: OrgTeam[]; // direct teams (no division)
  unassignedMembers: OrgMember[]; // members with no team assigned
}

export function useOrganizationTree(orgId: string | null) {
  return useQuery<OrganizationTree | null>({
    queryKey: orgId
      ? queryKeys.organizations.tree(orgId)
      : ["organizations", "tree"],
    queryFn: async () => {
      let resolvedOrgId = orgId;

      // If no orgId, fetch list first then use first org
      if (!resolvedOrgId) {
        const res = await fetch("/api/organizations");
        if (!res.ok) throw new Error("Failed to fetch organizations");
        const orgs = await res.json();
        if (!orgs.length) return null;
        resolvedOrgId = orgs[0].id;
      }

      const res = await fetch(`/api/organizations/${resolvedOrgId}/tree`);
      if (!res.ok) throw new Error("Failed to fetch organization tree");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}
