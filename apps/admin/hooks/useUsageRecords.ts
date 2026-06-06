"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  buildUsageRecordSearchParams,
  type UsageRecordFilters,
} from "@/lib/usage-record-filters";

export function useUsageRecords(filters: UsageRecordFilters) {
  return useQuery({
    queryKey: [...queryKeys.usageRecords.all, filters],
    queryFn: async () => {
      const params = buildUsageRecordSearchParams(filters);
      const res = await fetch(`/api/usage-records?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
