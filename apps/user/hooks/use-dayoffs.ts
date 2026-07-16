"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface DayoffRecord {
  id: string;
  approval_status: string;
  author_id: string;
  target_id: string;
  leave_date: string;
  leave_type_id: number;
  late_hour: string | null;
  late_minute: string | null;
  cc_member_ids: string[];
  reason: string | null;
  edit_reason?: string | null;
  approver_id: string | null;
  approved_at: string | null;
  last_editor_id: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author: { id: string; full_name: string } | null;
  target: { id: string; full_name: string } | null;
  approver: { id: string; full_name: string } | null;
  leave_type: {
    id: number;
    name: string;
    category: string;
    duration_type: string;
  } | null;
}

export interface LeaveType {
  id: number;
  name: string;
  category: string;
  duration_type: string;
  include_in_stats: boolean;
  deducts_annual?: boolean;
  deduction_amount?: number;
  has_separate_quota?: boolean;
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

export function useDayoffs(year: number, month: number, targetId?: string) {
  return useQuery<DayoffRecord[]>({
    queryKey: targetId
      ? [...queryKeys.dayoffs.byMonth(year, month), targetId]
      : queryKeys.dayoffs.byMonth(year, month),
    queryFn: async () => {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      if (targetId) params.set("target_id", targetId);
      const res = await fetch(`/api/dayoffs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch dayoffs");
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useDayoffsYearly(targetId: string | null, year: number) {
  return useQuery<DayoffRecord[]>({
    queryKey: queryKeys.dayoffs.byYear(targetId || "", year),
    queryFn: async () => {
      const params = new URLSearchParams({
        year: String(year),
        target_id: targetId!,
      });
      const res = await fetch(`/api/dayoffs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch yearly dayoffs");
      return res.json();
    },
    enabled: !!targetId,
    staleTime: 30 * 1000,
  });
}

export function useDayoffDetail(id: string | null) {
  return useQuery<DayoffRecord>({
    queryKey: queryKeys.dayoffs.detail(id || ""),
    queryFn: async () => {
      const res = await fetch(`/api/dayoffs/${id}`);
      if (!res.ok) throw new Error("Failed to fetch dayoff");
      return res.json();
    },
    enabled: !!id,
  });
}
