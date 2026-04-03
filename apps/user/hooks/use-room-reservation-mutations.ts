"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function useCreateRoomReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      room_id: string;
      date: string;
      start_time: string;
      end_time: string;
      type: "supervisor" | "interview" | "meeting" | "client_meeting" | "partner_meeting";
      title?: string;
      content?: string;
      reserved_by?: string;
      cc_members?: string[];
    }) => {
      const res = await fetch("/api/room-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roomReservations.all });
    },
  });
}

export function useUpdateRoomReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/room-reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roomReservations.all });
    },
  });
}

export function useDeleteRoomReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/room-reservations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roomReservations.all });
    },
  });
}
