"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { MemberCurrentStatus, MemberStatus } from "@/lib/supabase/types";

export function useMemberStatuses(filters: {
  status?: string;
  search?: string;
}) {
  return useQuery<MemberCurrentStatus[]>({
    queryKey: queryKeys.memberStatuses.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      const res = await fetch(`/api/member-statuses?${params}`);
      if (!res.ok) throw new Error("Failed to fetch member statuses");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useMemberStatusHistory(memberId: string | null) {
  return useQuery<MemberStatus[]>({
    queryKey: queryKeys.memberStatuses.history(memberId || ""),
    queryFn: async () => {
      const res = await fetch(`/api/member-statuses/history/${memberId}`);
      if (!res.ok) throw new Error("Failed to fetch status history");
      return res.json();
    },
    enabled: !!memberId,
    staleTime: 60 * 1000,
  });
}
