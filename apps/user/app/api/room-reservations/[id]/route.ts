import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

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
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

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

    // 본인 예약만 수정 가능 (reserved_by는 이름 text — POST와 동일 기준. 동명이인 한계 있음)
    const { data: current } = await db(supabase).select("*").eq("id", id).single();
    if (!current) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }
    if (current.reserved_by !== sessionUser.fullName) {
      return NextResponse.json({ error: "본인 예약만 수정할 수 있습니다." }, { status: 403 });
    }

    let conflicts: unknown[] = [];
    if (body.room_id || body.start_time || body.end_time) {
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

    // 허용 필드만 반영 (reserved_by 등 임의 컬럼 덮어쓰기 차단)
    const allowedFields = ["room_id", "date", "start_time", "end_time", "title"];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) updateData[key] = body[key];
    }

    const { data, error } = await db(supabase)
      .update(updateData)
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
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    // 본인 예약만 삭제 가능
    const { data: current } = await db(supabase).select("reserved_by").eq("id", id).single();
    if (!current) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }
    if (current.reserved_by !== sessionUser.fullName) {
      return NextResponse.json({ error: "본인 예약만 삭제할 수 있습니다." }, { status: 403 });
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
