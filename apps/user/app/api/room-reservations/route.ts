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

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    const { data, error } = await db(supabase)
      .select("*")
      .eq("date", date)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("GET /api/room-reservations error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_id, date, start_time, end_time, type, title, content, reserved_by, cc_members } = body;

    if (!room_id || !date || !start_time || !end_time || !type) {
      const missing = [
        !room_id ? "room_id" : null,
        !date ? "date" : null,
        !start_time ? "start_time" : null,
        !end_time ? "end_time" : null,
        !type ? "type" : null,
      ].filter(Boolean);
      return NextResponse.json(
        { error: "Missing required fields", missing },
        { status: 400 }
      );
    }
    if (!isValidTime(start_time) || !isValidTime(end_time)) {
      return NextResponse.json({ error: "Times must be on 30-min boundaries" }, { status: 400 });
    }
    if (end_time <= start_time) {
      return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    const { data: conflicts } = await db(supabase)
      .select("id, title, start_time, end_time")
      .eq("room_id", room_id)
      .eq("date", date)
      .lt("start_time", end_time)
      .gt("end_time", start_time);

    const { data, error } = await db(supabase)
      .insert({
        room_id,
        date,
        start_time,
        end_time,
        type,
        title: title ?? null,
        content: content ?? null,
        reserved_by: reserved_by ?? null,
        cc_members: cc_members ?? [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...data,
      warning: (conflicts?.length ?? 0) > 0,
      conflicts: conflicts ?? [],
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/room-reservations error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
