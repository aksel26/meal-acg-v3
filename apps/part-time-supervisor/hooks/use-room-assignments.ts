"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type RoomAssignmentItem = {
  assignment_id: string;
  worker_id: string;
  worker_name: string;
  job_posting_id: string;
  job_posting_title: string;
  room: string;
  start_time: string;
  end_time: string;
};

export function useRoomAssignments(
  date: string | null,
  jobPostingId?: string | null
) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (jobPostingId) params.set("job_posting_id", jobPostingId);

  const queryKey = jobPostingId
    ? queryKeys.roomAssignments.byDateAndJobPosting(date!, jobPostingId)
    : queryKeys.roomAssignments.byDate(date!);

  return useQuery<{ room_assignments: RoomAssignmentItem[] }>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/room-assignments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch room assignments");
      return res.json();
    },
    enabled: !!date,
  });
}
