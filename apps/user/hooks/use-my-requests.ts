"use client";

import { useQuery } from "@tanstack/react-query";
import type { RequestRecord } from "@/lib/requests";

export function useMyRequests() {
  return useQuery<RequestRecord[]>({
    queryKey: ["requests", "queue"],
    queryFn: async () => {
      const res = await fetch("/api/requests?view=queue");
      if (!res.ok) throw new Error("Failed to fetch my requests");
      return res.json();
    },
    staleTime: 1000 * 60 * 3,
  });
}
