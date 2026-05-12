"use client";

import { useQuery } from "@tanstack/react-query";

export type RecentActivity = {
  comments: {
    id: string;
    requestId: string;
    requestTitle: string;
    authorName: string;
    body: string;
    createdAt: string;
  }[];
  requests: {
    id: string;
    title: string;
    requesterName: string;
    status: string;
    createdAt: string;
  }[];
  projects: {
    id: string;
    title: string;
    ownerName: string | null;
    status: string;
    createdAt: string;
  }[];
};

export function useRecentActivity() {
  return useQuery<RecentActivity>({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const res = await fetch("/api/recent-activity");
      if (!res.ok) throw new Error("Failed to fetch recent activity");
      return res.json();
    },
    staleTime: 1000 * 60 * 3,
  });
}
