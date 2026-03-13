"use client";

import { useQuery } from "@tanstack/react-query";

type Member = {
  id: string;
  full_name: string;
  member_role: string;
};

export function useMembers() {
  return useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });
}
