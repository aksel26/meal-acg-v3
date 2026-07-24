"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface LeaveBalance {
  id: string;
  member_id: string;
  year: number;
  type: "monthly" | "annual" | "summer";
  granted: number;
  used: number;
  adjusted: number;
  note: string | null;
}

export function useLeaveBalances(memberId: string | null, year: number) {
  return useQuery<LeaveBalance[]>({
    queryKey: queryKeys.leaveBalances.byYear(memberId || "", year),
    queryFn: async () => {
      const params = new URLSearchParams({
        memberId: memberId!,
        year: String(year),
      });
      const res = await fetch(`/api/leave-balances?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("연차 잔액 조회 실패");
      return res.json();
    },
    enabled: !!memberId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
