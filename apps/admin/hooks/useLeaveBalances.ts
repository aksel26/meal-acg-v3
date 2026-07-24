import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

export interface LeaveBalance {
  id: string;
  member_id: string;
  year: number;
  type: string;
  granted: number;
  used: number;
  adjusted: number;
  note: string | null;
  member: {
    id: string;
    full_name: string;
    hire_date: string | null;
    position: { name: string } | null;
  };
}

export function useLeaveBalances(year: number) {
  return useQuery<LeaveBalance[]>({
    queryKey: queryKeys.leaveBalances.byYear(year),
    queryFn: async () => {
      const res = await fetch(`/api/leave-balances?year=${year}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch leave balances");
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useGenerateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (year: number) => {
      const res = await fetch("/api/leave-balances/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }
      return res.json();
    },
    onSuccess: (data, year) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalances.byYear(year) });
      toast.success(`${data.generated}명의 연차가 부여되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export interface LeaveTypeInfo {
  id: number;
  name: string;
  sort_order: number;
}

export interface MemberUsageStat {
  member_id: string;
  full_name: string;
  position_name: string | null;
  counts: Record<number, number>;
  total: number;
}

export interface UsageStatsResponse {
  leaveTypes: LeaveTypeInfo[];
  stats: MemberUsageStat[];
}

export function useLeaveUsageStats(year: number) {
  return useQuery<UsageStatsResponse>({
    queryKey: [...queryKeys.leaveBalances.all, "usage-stats", year],
    queryFn: async () => {
      const res = await fetch(`/api/leave-balances/usage-stats?year=${year}`);
      if (!res.ok) throw new Error("Failed to fetch usage stats");
      return res.json();
    },
  });
}

export function useAdjustLeaveBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adjustment, reason }: { id: string; adjustment: number; reason: string }) => {
      const res = await fetch(`/api/leave-balances/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustment, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to adjust");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
      toast.success("연차가 조정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
