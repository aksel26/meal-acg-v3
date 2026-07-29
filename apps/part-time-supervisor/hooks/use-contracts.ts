"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { ContractDocument } from "@/lib/supabase/types";

type ContractWithUrl = ContractDocument & { signedUrl?: string };

export function useContracts(workerId: string | null) {
  return useQuery<ContractDocument[]>({
    queryKey: queryKeys.contracts.byWorker(workerId!),
    queryFn: async () => {
      const res = await fetch(`/api/contracts?worker_id=${workerId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!workerId,
  });
}

export function useContractUrl(id: string | null) {
  return useQuery<ContractWithUrl>({
    queryKey: ["contracts", "url", id],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useUploadContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workerId, file, assignmentId }: { workerId: string; file: File; assignmentId?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("worker_id", workerId);
      if (assignmentId) formData.append("assignment_id", assignmentId);

      const res = await fetch("/api/contracts", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to upload");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.byWorker(variables.workerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.detail(variables.workerId) });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; workerId: string }) => {
      const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.byWorker(variables.workerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.detail(variables.workerId) });
    },
  });
}
