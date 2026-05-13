import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

function isValidTime(t: string): boolean {
  const [, min] = t.split(":");
  return min === "00" || min === "30";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: any) {
  return supabase.schema("supervisor").from("room_reservations");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.start_time && !isValidTime(body.start_time)) {
      return NextResponse.json({ error: "start_time must be on 30-min boundary" }, { status: 400 });
    }
    if (body.end_time && !isValidTime(body.end_time)) {
      return NextResponse.json({ error: "end_time must be on 30-min boundary" }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    let conflicts: unknown[] = [];
    if (body.room_id || body.start_time || body.end_time) {
      const { data: current } = await db(supabase)
        .select("*")
        .eq("id", id)
        .single();

      if (current) {
        const roomId = body.room_id ?? current.room_id;
        const date = body.date ?? current.date;
        const startTime = body.start_time ?? current.start_time;
        const endTime = body.end_time ?? current.end_time;

        if (endTime <= startTime) {
          return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
        }

        const { data: overlaps } = await db(supabase)
          .select("id, title, start_time, end_time")
          .eq("room_id", roomId)
          .eq("date", date)
          .lt("start_time", endTime)
          .gt("end_time", startTime)
          .neq("id", id);

        conflicts = overlaps ?? [];
      }
    }

    const { data, error } = await db(supabase)
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...data,
      warning: conflicts.length > 0,
      conflicts,
    });
  } catch (error) {
    console.error("PATCH /api/room-reservations/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    const { error } = await db(supabase)
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/room-reservations/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
