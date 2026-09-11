"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  buildUsageRecordSearchParams,
  type UsageRecordFilters,
} from "@/lib/usage-record-filters";

export function useUsageRecords<T>(filters: UsageRecordFilters, page = 1) {
  return useQuery({
    queryKey: [...queryKeys.usageRecords.all, "page", filters, page],
    queryFn: async () => {
      const params = buildUsageRecordSearchParams(filters);
      params.set("page", String(page));
      const res = await fetch(`/api/usage-records?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{
        data: T[];
        count: number;
        page: number;
        pageSize: number;
      }>;
    },
    staleTime: 60 * 1000,
  });
}

export function useUsageRecordAmountOptions(filters: UsageRecordFilters) {
  return useQuery<number[]>({
    queryKey: [...queryKeys.usageRecords.all, "amount-options", filters],
    queryFn: async () => {
      const params = buildUsageRecordSearchParams(filters);
      params.set("mode", "amount-options");
      const res = await fetch(`/api/usage-records?${params}`);
      if (!res.ok) throw new Error("Failed to fetch amount options");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
