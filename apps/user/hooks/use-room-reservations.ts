"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type RoomReservation = {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  type: "supervisor" | "interview" | "meeting" | "client_meeting" | "partner_meeting";
  title: string | null;
  content: string | null;
  reserved_by: string;
  cc_members: string[];
  created_at: string;
  updated_at: string;
};

export function useRoomReservations(date: string) {
  return useQuery<RoomReservation[]>({
    queryKey: queryKeys.roomReservations.byDate(date),
    queryFn: async () => {
      const res = await fetch(`/api/room-reservations?date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!date,
  });
}
