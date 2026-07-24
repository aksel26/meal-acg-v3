"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface DayoffRecord {
  id: string;
  author_id: string;
  target_id: string;
  leave_date: string;
  leave_type_id: number;
  late_hour: string | null;
  late_minute: string | null;
  cc_member_ids: string[];
  reason: string | null;
  approver_id: string | null;
  approved_at: string | null;
  last_editor_id: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author: { id: string; full_name: string } | null;
  target: { id: string; full_name: string } | null;
  approver: { id: string; full_name: string } | null;
  last_editor: { id: string; full_name: string } | null;
  leave_type: {
    id: number;
    name: string;
    category: string;
    duration_type: string;
  } | null;
}

export interface DayoffStats {
  member_id: string;
  member_name: string;
  team_name: string | null;
  types: Record<number, number>;
}

export interface LeaveType {
  id: number;
  name: string;
  category: string;
  duration_type: string;
  include_in_stats: boolean;
  sort_order: number;
}

export function useLeaveTypes() {
  return useQuery<LeaveType[]>({
    queryKey: queryKeys.leaveTypes.all,
    queryFn: async () => {
      const res = await fetch("/api/leave-types");
      if (!res.ok) throw new Error("Failed to fetch leave types");
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function useDayoffs(year: number, month: number) {
  return useQuery<DayoffRecord[]>({
    queryKey: queryKeys.dayoffs.byMonth(year, month),
    queryFn: async () => {
      const res = await fetch(`/api/dayoffs?year=${year}&month=${month}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch dayoffs");
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useDayoffsByTarget(targetId: string, year: number) {
  return useQuery<DayoffRecord[]>({
    queryKey: [...queryKeys.dayoffs.byTarget(targetId), year],
    queryFn: async () => {
      const res = await fetch(`/api/dayoffs?target_id=${targetId}&year=${year}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch dayoffs");
      return res.json();
    },
    enabled: !!targetId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useDayoffDetail(id: string | null) {
  return useQuery<DayoffRecord>({
    queryKey: queryKeys.dayoffs.detail(id || ""),
    queryFn: async () => {
      const res = await fetch(`/api/dayoffs/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch dayoff");
      return res.json();
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useDayoffStats(year: number, month: number) {
  return useQuery<DayoffStats[]>({
    queryKey: queryKeys.dayoffs.stats(year, month),
    queryFn: async () => {
      const res = await fetch(
        `/api/dayoffs/stats?year=${year}&month=${month}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to fetch dayoff stats");
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
