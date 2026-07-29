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
      const res = await fetch(`/api/budget-summary?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!period,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export interface BudgetPeriodSettings {
  period: string;
  welfare_amount: number;
  leader_rate: number;
  manager_rate: number;
  pnc_extra_rate: number;
}

export function useBudgetSettings(period: string) {
  return useQuery<BudgetPeriodSettings | null>({
    queryKey: queryKeys.budgetSettings.byPeriod(period),
    queryFn: async () => {
      const params = new URLSearchParams({ period, settings: "true" });
      const res = await fetch(`/api/budget-allocations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch budget settings");
      return res.json();
    },
    enabled: !!period,
  });
}
