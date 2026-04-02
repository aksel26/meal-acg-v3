"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

interface ModifyRequestPayload {
  attendanceRecordId: string;
  requesterId: string;
  originalType: string;
  requestedType: string;
  reason: string;
}

export interface ModifyRequest {
  id: string;
  attendance_record_id: string;
  requester_id: string;
  original_type: string;
  requested_type: string;
  reason: string;
  approval_status: string;
  created_at: string;
  attendance_record: {
    id: string;
    date: string;
    attendance_type: string;
    check_in_at: string | null;
    check_out_at: string | null;
  } | null;
}

export function useAttendanceModifyRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ModifyRequestPayload) => {
      const res = await fetch("/api/attendance/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "수정 요청 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.modifyRequests.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.all,
      });
      toast.success("근태 수정 요청이 제출되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useMyModifyRequests(memberId: string | null) {
  return useQuery<ModifyRequest[]>({
    queryKey: queryKeys.attendance.modifyRequests.byMember(memberId || ""),
    queryFn: async () => {
      const params = new URLSearchParams({ memberId: memberId! });
      const res = await fetch(`/api/attendance/modify?${params}`);
      if (!res.ok) throw new Error("수정 요청 목록 조회 실패");
      return res.json();
    },
    enabled: !!memberId,
  });
}
