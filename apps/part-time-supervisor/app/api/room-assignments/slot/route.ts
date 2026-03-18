import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { ROOMS, type RoomSlot } from "@/lib/room-constants";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const replaceMode = searchParams.get("replace") === "true";
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

    const startHour = parseInt(start_time.split(":")[0] ?? "0", 10);
    const endHour = parseInt(end_time.split(":")[0] ?? "0", 10);
    if (endHour - startHour !== 1) {
      return NextResponse.json(
        { error: "슬롯은 정확히 1시간이어야 합니다." },
        { status: 400 }
      );
    }

    const validRoom = ROOMS.find((r) => r.id === room);
    if (!validRoom) {
      return NextResponse.json(
        { error: "유효하지 않은 회의실입니다." },
        { status: 400 }
      );
    }

    // 수용 인원 체크
    if (validRoom.capacity > 0) {
      const { data: allAssignments } = await supabase
        .from("assignments")
        .select("id, room_slots")
        .neq("status", "cancelled");

      let count = 0;
      for (const a of allAssignments || []) {
        const slots: RoomSlot[] = a.room_slots || [];
        count += slots.filter(
          (s) =>
            s.date === date && s.start_time === start_time && s.room === room
        ).length;
      }

      if (count >= validRoom.capacity) {
        return NextResponse.json(
          {
            error: "수용 인원 초과",
            current: count,
            capacity: validRoom.capacity,
          },
          { status: 400 }
        );
      }
    }

    // 현재 room_slots 가져오기
    const { data: current, error: fetchError } = await supabase
      .from("assignments")
      .select("room_slots")
      .eq("id", assignment_id)
      .single();

    if (fetchError) throw fetchError;

    const existingSlots: RoomSlot[] = current.room_slots || [];

    // 중복 체크
    const isDuplicate = existingSlots.some(
      (s) =>
        s.date === date && s.start_time === start_time && s.room === room
    );
    if (isDuplicate) {
      return NextResponse.json(
        { error: "이미 배정된 슬롯입니다." },
        { status: 409 }
      );
    }

    // 1룸 제약: 다른 room의 슬롯이 이미 존재하는지 체크
    const existingRooms = new Set(existingSlots.map((s) => s.room));
    const hasOtherRoom = existingRooms.size > 0 && !existingRooms.has(room as RoomSlot["room"]);

    if (hasOtherRoom && !replaceMode) {
      const existingRoom = existingSlots[0]?.room ?? "";
      return NextResponse.json(
        { error: "already_assigned", existing_room: existingRoom },
        { status: 409 }
      );
    }

    const newSlot: RoomSlot = {
      date,
      start_time,
      end_time,
      room: room as RoomSlot["room"],
    };

    let updatedSlots: RoomSlot[];
    if (hasOtherRoom && replaceMode) {
      // 기존 슬롯의 room을 새 room으로 일괄 변경 (시간대 보존)
      const migratedSlots: RoomSlot[] = existingSlots.map((s) => ({
        ...s,
        room: room as RoomSlot["room"],
      }));
      // 새 슬롯이 이미 migrated에 포함되어 있으면 중복 추가하지 않음
      const alreadyExists = migratedSlots.some(
        (s) => s.date === date && s.start_time === start_time
      );
      updatedSlots = alreadyExists ? migratedSlots : [...migratedSlots, newSlot];
    } else {
      updatedSlots = [...existingSlots, newSlot];
    }

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
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/room-assignments/slot error:", error);
    return NextResponse.json(
      { error: "Failed to add slot" },
      { status: 500 }
    );
  }
}
