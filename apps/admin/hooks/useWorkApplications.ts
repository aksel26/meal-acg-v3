import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import { queryKeys } from "@/lib/query-keys";

export type WorkApplicationStatus = "pending" | "approved" | "rejected";

export interface WorkApplication {
  id: string;
  requester_id: string;
  application_type: "overtime" | "weekend";
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

export function useWorkApplications(filters: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value);
  });

  return useQuery<WorkApplication[]>({
    queryKey: queryKeys.workApplications.list(filters),
    queryFn: async () => {
      const res = await fetch(`/api/work-applications?${params.toString()}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "근무 신청 조회 실패");
      }
      return res.json();
    },
  });
}

export function useUpdateWorkApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      rejectReason,
    }: {
      id: string;
      status: WorkApplicationStatus;
      rejectReason?: string;
    }) => {
      const res = await fetch(`/api/work-applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectReason }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "근무 신청 상태 변경 실패");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workApplications.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      toast.success("상태가 변경되었습니다.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
