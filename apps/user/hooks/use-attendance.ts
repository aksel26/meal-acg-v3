"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

interface AttendanceRecord {
  id: string;
  member_id: string;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useAttendance(memberId: string | null, date: string) {
  return useQuery<AttendanceRecord | null>({
    queryKey: queryKeys.attendance.byDate(memberId || "", date),
    queryFn: async () => {
      const params = new URLSearchParams({
        memberId: memberId!,
        date,
      });
      const res = await fetch(`/api/attendance?${params}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
    enabled: !!memberId,
    staleTime: 30 * 1000,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, action: "check_in" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "출근 처리 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      toast.success("출근 완료!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      earlyLeaveReason,
    }: {
      memberId: string;
      earlyLeaveReason?: string;
    }) => {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, action: "check_out", earlyLeaveReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "퇴근 처리 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      toast.success("퇴근 완료! 수고하셨습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
