import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { RoomSlot } from "@/lib/room-constants";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const jobPostingId = searchParams.get("job_posting_id");

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    let query = supabase
      .from("assignments")
      .select(
        "id, worker_id, job_posting_id, status, room_slots, worker:workers(id, name), job_posting:job_postings(id, title)"
      )
      .neq("status", "cancelled");

    if (jobPostingId) {
      query = query.eq("job_posting_id", jobPostingId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const roomAssignments = (data || []).flatMap((assignment) => {
      const slots: RoomSlot[] = assignment.room_slots || [];
      return slots
        .filter((slot) => slot.date === date)
        .map((slot) => ({
          assignment_id: assignment.id,
          worker_id: assignment.worker_id,
          worker_name:
            (assignment.worker as unknown as { id: string; name: string } | null)?.name ||
            "",
          job_posting_id: assignment.job_posting_id,
          job_posting_title:
            (assignment.job_posting as unknown as { id: string; title: string } | null)
              ?.title || "",
          room: slot.room,
          start_time: slot.start_time,
          end_time: slot.end_time,
        }));
    });

    return NextResponse.json({ room_assignments: roomAssignments });
  } catch (error) {
    console.error("GET /api/room-assignments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch room assignments" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();
    const { assignment_id, room_slots } = body as {
      assignment_id: string;
      room_slots: RoomSlot[];
    };

    if (!assignment_id || !Array.isArray(room_slots)) {
      return NextResponse.json(
        { error: "assignment_id and room_slots required" },
        { status: 400 }
      );
    }

    for (const slot of room_slots) {
      const start = parseInt(slot.start_time.split(":")[0] ?? "0", 10);
      const end = parseInt(slot.end_time.split(":")[0] ?? "0", 10);
      if (end - start !== 1) {
        return NextResponse.json(
          { error: "각 슬롯은 정확히 1시간이어야 합니다." },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("assignments")
      .update({ room_slots })
      .eq("id", assignment_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT /api/room-assignments error:", error);
    return NextResponse.json(
      { error: "Failed to update room assignments" },
      { status: 500 }
    );
  }
}
