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
    leave_date?: string | null;
    work_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    application_type?: string | null;
    project_name?: string | null;
    reason: string | null;
    target?: { id: string; full_name: string } | null;
    leave_type?: { id: number; name: string; category: string } | null;
    first_approver?: { id: string; full_name: string } | null;
    final_approver?: { id: string; full_name: string } | null;
    first_approved_at?: string | null;
    final_approved_at?: string | null;
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
      const res = await fetch(`/api/approvals?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch approvals");
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

// action: 미지정 시 "approve" — dayoffs는 라우트가 현재 상태(pending/pre_approved)를 보고
// 가승인/최종승인으로 자동 분기한다. 명시적으로 "pre_approve"를 보내도 동일하게 동작한다.
export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action = "approve",
    }: {
      id: string;
      action?: "approve" | "pre_approve";
    }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "승인 처리 실패");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dayoffs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(
        variables?.action === "pre_approve"
          ? "가승인되었습니다."
          : "승인되었습니다.",
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// 가승인 취소 (pre_approved → pending, 휴가 전용)
export function useRevertApprovalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "가승인 취소 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dayoffs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("가승인이 취소되었습니다.");
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
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("반려되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
