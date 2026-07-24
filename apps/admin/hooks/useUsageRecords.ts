"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function useUsageRecords(filters: {
  period?: string;
  type?: string;
  member_id?: string;
  review_status?: string;
}) {
  return useQuery({
    queryKey: [...queryKeys.usageRecords.all, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.period) params.set("period", filters.period);
      if (filters.type) params.set("type", filters.type);
      if (filters.member_id) params.set("member_id", filters.member_id);
      if (filters.review_status) params.set("review_status", filters.review_status);
      const res = await fetch(`/api/usage-records?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
