"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { MemberCurrentStatus } from "@/lib/supabase/types";

/**
 * 특이사항(육아휴직/병가/재택근무/파견/휴직/퇴사 등)이 있는 멤버 목록을 조회합니다.
 * current_status가 null이 아닌 멤버만 반환합니다.
 */
export function useActiveStatusMembers() {
  return useQuery<MemberCurrentStatus[]>({
    queryKey: queryKeys.memberStatuses.active,
    queryFn: async () => {
      const res = await fetch("/api/member-statuses");
      if (!res.ok) throw new Error("Failed to fetch member statuses");
      const data: MemberCurrentStatus[] = await res.json();
      return data.filter((m) => m.current_status !== null);
    },
    staleTime: 2 * 60 * 1000,
  });
}
