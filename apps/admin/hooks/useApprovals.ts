import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

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
  requester: { id: string; full_name: string } | null;
  approver: { id: string; full_name: string } | null;
  resolver: { id: string; full_name: string } | null;
  related_data: {
    id: string;
    leave_date: string;
    reason: string | null;
    target: { id: string; full_name: string } | null;
    leave_type: { id: number; name: string; category: string } | null;
  } | null;
}

export function useApprovals(status?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);

  return useQuery<ApprovalRequest[]>({
    queryKey: status
      ? queryKeys.approvals.byStatus(status)
      : queryKeys.approvals.all,
    queryFn: async () => {
      const res = await fetch(`/api/approvals?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch approvals");
      return res.json();
    },
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
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
      toast.success("승인되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCancelApprovalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "취소 처리 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dayoffs.all });
      toast.success("처리가 취소되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      rejectReason,
    }: {
      id: string;
      rejectReason?: string;
    }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectReason }),
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
      toast.success("반려되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
