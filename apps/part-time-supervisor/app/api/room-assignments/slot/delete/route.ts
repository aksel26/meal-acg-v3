import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { RoomSlot } from "@/lib/room-constants";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();
    const { assignment_id, date, start_time, end_time, room } = body as {
      assignment_id: string;
      date: string;
      start_time: string;
      end_time: string;
      room: string;
    };

    if (!assignment_id || !date || !start_time || !end_time || !room) {
      return NextResponse.json(
        { error: "모든 필드가 필요합니다." },
        { status: 400 }
      );
    }

    const { data: current, error: fetchError } = await supabase
      .from("assignments")
      .select("room_slots")
      .eq("id", assignment_id)
      .single();

    if (fetchError) throw fetchError;

    const existingSlots: RoomSlot[] = current.room_slots || [];
    const updatedSlots = existingSlots.filter(
      (s) =>
        !(
          s.date === date &&
          s.start_time === start_time &&
          s.end_time === end_time &&
          s.room === room
        )
    );

    const { data, error } = await supabase
      .from("assignments")
      .update({
        room_slots: updatedSlots,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/room-assignments/slot/delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete slot" },
      { status: 500 }
    );
  }
}
