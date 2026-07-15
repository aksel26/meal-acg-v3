import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type WorkApplicationType = "overtime" | "weekend";
export type WorkApplicationStatus = "pending" | "approved" | "rejected";

export interface WorkApplication {
  id: string;
  requester_id: string;
  application_type: WorkApplicationType;
  work_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  project_name: string;
  reason: string;
  status: WorkApplicationStatus;
  approver_id: string | null;
  approved_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  approval_id: string | null;
  approval_ids?: string[];
  approver_ids?: string[];
  cc_member_ids?: string[];
  my_approval_status?: WorkApplicationStatus | null;
  requester?: {
    id: string;
    full_name: string;
    member_role: string | null;
    team_id: string | null;
    division_id: string | null;
    team?: { name: string | null; division_id: string | null } | null;
  } | null;
  approver?: { id: string; full_name: string } | null;
}

export function useWorkApplications(
  memberId: string,
  scope: "mine" | "managed",
  filters: { status?: string; type?: string } = {},
) {
  const params = new URLSearchParams({ memberId, scope });
  if (filters.status && filters.status !== "all")
    params.set("status", filters.status);
  if (filters.type && filters.type !== "all") params.set("type", filters.type);

  return useQuery<WorkApplication[]>({
    queryKey: queryKeys.workApplications.list(
      memberId,
      scope,
      filters.status,
      filters.type,
    ),
    queryFn: async () => {
      const res = await fetch(`/api/work-applications?${params.toString()}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "근무 신청 조회 실패");
      }
      return res.json();
    },
    enabled: !!memberId,
  });
}

export function useCreateWorkApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requesterId: string;
      applicationType: WorkApplicationType;
      workDate: string;
      startTime: string;
      endTime: string;
      projectName: string;
      reason: string;
      location?: string;
      approverId?: string;
      approverIds?: string[];
      ccMemberIds?: string[];
    }) => {
      const res = await fetch("/api/work-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "근무 신청 등록 실패");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workApplications.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.myRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useProcessWorkApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      approverId: string;
      action: "approve" | "reject";
      rejectReason?: string;
    }) => {
      const res = await fetch(`/api/work-applications/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "근무 신청 처리 실패");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workApplications.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}
