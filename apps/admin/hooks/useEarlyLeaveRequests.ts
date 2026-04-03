import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

export interface EarlyLeaveRequest {
  id: string;
  attendance_record_id: string;
  requester_id: string;
  reason: string;
  approval_status: "pending" | "pre_approved" | "approved" | "rejected";
  first_approver_id: string | null;
  first_approved_at: string | null;
  final_approver_id: string | null;
  final_approved_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  requester: { id: string; full_name: string } | null;
  first_approver: { id: string; full_name: string } | null;
  final_approver: { id: string; full_name: string } | null;
  attendance_record: {
    id: string;
    date: string;
    check_in_at: string | null;
    check_out_at: string | null;
    status: string;
    overtime_minutes: number;
  } | null;
}

export function useEarlyLeaveRequests(status?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);

  return useQuery<EarlyLeaveRequest[]>({
    queryKey: status
      ? queryKeys.earlyLeaveRequests.byStatus(status)
      : queryKeys.earlyLeaveRequests.all,
    queryFn: async () => {
      const res = await fetch(`/api/early-leave-requests?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch early leave requests");
      return res.json();
    },
  });
}

type EarlyLeaveAction = "pre_approve" | "approve" | "reject" | "revert";

export function useUpdateEarlyLeaveStatus() {
  const queryClient = useQueryClient();

  const ACTION_LABELS: Record<EarlyLeaveAction, string> = {
    pre_approve: "가승인",
    approve: "최종승인",
    reject: "반려",
    revert: "되돌리기",
  };

  return useMutation({
    mutationFn: async ({
      id,
      action,
      rejectReason,
    }: {
      id: string;
      action: EarlyLeaveAction;
      rejectReason?: string;
    }) => {
      const res = await fetch(`/api/early-leave-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "처리 실패");
      }
      return { data: await res.json(), action };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.earlyLeaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      toast.success(`${ACTION_LABELS[variables.action]} 처리되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
