"use client";

import { useQuery } from "@tanstack/react-query";

export type ProjectStats = {
  activeProjects: number;
  urgentProjects: number;
  completedThisMonth: number;
  completedThisYear: number;
  openAssigned: number;
  urgentCount: number;
  topRequester: { name: string; count: number } | null;
  topTeam: { name: string; count: number } | null;
  topCustomer: { name: string; count: number } | null;
};

export function useProjectStats() {
  return useQuery<ProjectStats>({
    queryKey: ["project-stats"],
    queryFn: async () => {
      const res = await fetch("/api/project-stats");
      if (!res.ok) throw new Error("Failed to fetch project stats");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
