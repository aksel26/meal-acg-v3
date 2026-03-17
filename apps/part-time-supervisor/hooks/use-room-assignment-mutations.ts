"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

type SlotParams = {
  assignment_id: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
};

export function useAddRoomSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SlotParams) => {
      const res = await fetch("/api/room-assignments/slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add slot");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roomAssignments.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.all,
      });
    },
  });
}

export function useDeleteRoomSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SlotParams) => {
      const res = await fetch("/api/room-assignments/slot/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete slot");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roomAssignments.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.all,
      });
    },
  });
}
