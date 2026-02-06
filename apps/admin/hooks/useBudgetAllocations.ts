"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function useBudgetAllocations(period: string, type?: string) {
  return useQuery({
    queryKey: type
      ? queryKeys.budgetAllocations.byPeriodAndType(period, type)
      : queryKeys.budgetAllocations.byPeriod(period),
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (type) params.set("type", type);
      const res = await fetch(`/api/budget-allocations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!period,
    staleTime: 2 * 60 * 1000,
  });
}

export function useBudgetSummary(period: string, type?: string) {
  return useQuery({
    queryKey: type
      ? queryKeys.budgetSummary.byPeriodAndType(period, type)
      : queryKeys.budgetSummary.byPeriod(period),
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (type) params.set("type", type);
      const res = await fetch(`/api/budget-summary?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!period,
    staleTime: 2 * 60 * 1000,
  });
}
