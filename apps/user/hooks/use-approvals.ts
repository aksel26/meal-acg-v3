import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface DayoffApprovalData {
  id: string;
  leave_date: string;
  reason: string | null;
  target?: { id: string; full_name: string } | null;
  leave_type?: { id: number; name: string; category: string } | null;
  first_approver?: { id: string; full_name: string } | null;
  final_approver?: { id: string; full_name: string } | null;
  first_approved_at?: string | null;
  final_approved_at?: string | null;
}

export interface AttendanceModifyApprovalData {
  id: string;
  attendance_record_id: string;
  requester_id: string;
  original_type: string;
  requested_type: string;
  reason: string;
  approval_status: string;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  requester?: { id: string; full_name: string } | null;
  attendance_record?: {
    id: string;
    member_id: string;
    date: string;
    attendance_type: string;
    check_in_at: string | null;
    check_out_at: string | null;
  } | null;
}

export interface WorkApplicationApprovalData {
  id: string;
  application_type: "overtime" | "weekend";
  work_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  project_name: string;
  reason: string;
  status: string;
}

export type ApprovalRelatedData =
  | DayoffApprovalData
  | AttendanceModifyApprovalData
  | WorkApplicationApprovalData
  | null;

export interface ApprovalRequest {
  id: string;
  type: string;
  requester_id: string;
  approver_id: string;
  status: string;
  cc_member_ids: string[] | null;
  related_table: string | null;
  related_id: string | null;
  reject_reason: string | null;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  requester?: { id: string; full_name: string } | null;
  approver?: { id: string; full_name: string } | null;
  related_data: ApprovalRelatedData;
}

// 내가 승인할 요청 목록
export function useApprovals(memberId: string, status?: string) {
  const params = new URLSearchParams({ memberId });
  if (status) params.set("status", status);

  return useQuery<ApprovalRequest[]>({
    queryKey: status
      ? queryKeys.approvals.byStatus(memberId, status)
      : queryKeys.approvals.pending(memberId),
    queryFn: async () => {
      const res = await fetch(`/api/approvals?${params.toString()}`);
      if (!res.ok) throw new Error("승인 목록 조회 실패");
      return res.json();
    },
    enabled: !!memberId,
  });
}

// 내가 신청한 요청 목록
export function useMyRequests(memberId: string) {
  return useQuery<ApprovalRequest[]>({
    queryKey: queryKeys.myRequests.byMember(memberId),
    queryFn: async () => {
      const res = await fetch(`/api/my-requests?memberId=${memberId}`);
      if (!res.ok) throw new Error("내 신청 목록 조회 실패");
      return res.json();
    },
    enabled: !!memberId,
  });
}

// 참조된 요청 목록 (내가 CC에 포함된 건)
export function useCcRequests(memberId: string) {
  return useQuery<ApprovalRequest[]>({
    queryKey: queryKeys.approvals.cc
      ? queryKeys.approvals.cc(memberId)
      : ["approvals", "cc", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/approvals/cc?memberId=${memberId}`);
      if (!res.ok) throw new Error("참조 목록 조회 실패");
      return res.json();
    },
    enabled: !!memberId,
  });
}

// 휴가 신청
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      memberId: string;
      startDate: string;
      endDate?: string;
      leaveTypeId: number;
      approverId: string;
      lateHour?: string;
      lateMinute?: string;
      ccMemberIds?: string[];
      reason?: string;
      requestId?: string;
    }) => {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          requestId: data.requestId ?? crypto.randomUUID(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "휴가 신청 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dayoffs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.mealStats.all });
    },
  });
}

// 승인 처리
export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      approvalId,
      memberId,
    }: {
      approvalId: string;
      memberId: string;
    }) => {
      const res = await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, memberId, action: "approve" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "승인 처리 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dayoffs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.mealStats.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.modifyRequests.all,
      });
    },
  });
}

// 반려 처리
export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      approvalId,
      memberId,
      rejectReason,
    }: {
      approvalId: string;
      memberId: string;
      rejectReason?: string;
    }) => {
      const res = await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          memberId,
          action: "reject",
          rejectReason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "반려 처리 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dayoffs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.mealStats.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.modifyRequests.all,
      });
    },
  });
}
