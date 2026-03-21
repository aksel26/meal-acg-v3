"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function useInterviewSettlement(year: number, month: number, role?: string, search?: string) {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (role) params.set("role", role);
  if (search) params.set("search", search);

  return useQuery({
    queryKey: [...queryKeys.interviewSettlement.byMonth(year, month), role, search],
    queryFn: async () => {
      const res = await fetch(`/api/interview/settlement?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}
