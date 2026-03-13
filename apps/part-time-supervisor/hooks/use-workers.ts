"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Worker, Assignment, ContractDocument } from "@/lib/supabase/types";

type WorkerWithCount = Worker & {
  assignments: { count: number }[];
};

type WorkerDetail = Worker & {
  assignments: (Assignment & {
    job_posting: { id: string; title: string; status: string } | null;
  })[];
  contracts: ContractDocument[];
};

export function useWorkers(status?: string) {
  return useQuery<WorkerWithCount[]>({
    queryKey: [...queryKeys.workers.all, status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : "";
      const res = await fetch(`/api/workers${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

export function useWorker(id: string | null) {
  return useQuery<WorkerDetail>({
    queryKey: queryKeys.workers.detail(id!),
    queryFn: async () => {
      const res = await fetch(`/api/workers/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!id,
  });
}
