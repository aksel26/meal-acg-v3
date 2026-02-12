import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// --- Types ---

type PointsType = "welfare" | "activity";

interface AddUsageInput {
  type: PointsType;
  allocation_id: string;
  member_id: string;
  amount: number;
  description: string;
  used_at: string;
  companions?: string[];
  receipt_url?: string;
  notes?: string;
  delay_reason?: string;
}

interface UpdateUsageInput {
  type: PointsType;
  id: string;
  member_id?: string;
  amount?: number;
  description?: string;
  used_at?: string;
  companions?: string[];
  receipt_url?: string;
  notes?: string;
  delay_reason?: string;
}

interface DeleteUsageInput {
  type: PointsType;
  id: string;
  member_id: string;
}

// --- Helpers ---

function getEndpointPath(type: PointsType): string {
  return type === "welfare" ? "/api/points/welfare" : "/api/points/activity";
}

function invalidatePointsQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.points.all,
  });
}

// --- Mutation Hooks ---

/**
 * 사용내역 등록 (복지포인트 / 활동비)
 */
export function useAddUsageRecord() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, AddUsageInput>({
    mutationFn: async ({ type, ...body }) => {
      const response = await fetch(getEndpointPath(type), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "사용내역 등록에 실패했습니다.");
      }

      return data;
    },
    onSuccess: () => {
      invalidatePointsQueries(queryClient);
    },
  });
}

/**
 * 사용내역 수정 (복지포인트 / 활동비)
 */
export function useUpdateUsageRecord() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, UpdateUsageInput>({
    mutationFn: async ({ type, ...body }) => {
      const response = await fetch(getEndpointPath(type), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "사용내역 수정에 실패했습니다.");
      }

      return data;
    },
    onSuccess: () => {
      invalidatePointsQueries(queryClient);
    },
  });
}

/**
 * 사용내역 삭제 (복지포인트 / 활동비)
 */
export function useDeleteUsageRecord() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, DeleteUsageInput>({
    mutationFn: async ({ type, id, member_id }) => {
      const params = new URLSearchParams({ id, member_id });
      const response = await fetch(`${getEndpointPath(type)}?${params}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "사용내역 삭제에 실패했습니다.");
      }

      return data;
    },
    onSuccess: () => {
      invalidatePointsQueries(queryClient);
    },
  });
}
