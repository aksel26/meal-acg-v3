import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("locker:write");
    const { id } = await params;
    const body = await request.json();
    const memberId = normalizeText(body.memberId);

    if (!memberId) {
      return NextResponse.json(
        { error: "배정할 직원을 선택해주세요." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient() as any;
    const now = new Date().toISOString();

    const { data: locker, error: lockerError } = await supabase
      .from("lockers")
      .select("id, status")
      .eq("id", id)
      .single();

    if (lockerError || !locker) {
      return NextResponse.json(
        { error: "사물함을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (locker.status === "disabled") {
      return NextResponse.json(
        { error: "사용 중지된 사물함에는 배정할 수 없습니다." },
        { status: 400 },
      );
    }

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "직원을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { data: occupiedAssignment } = await supabase
      .from("locker_assignments")
      .select("member_id, locker_id")
      .eq("locker_id", id)
      .is("released_at", null)
      .maybeSingle();

    await supabase
      .from("locker_assignments")
      .update({ released_at: now })
      .eq("locker_id", id)
      .is("released_at", null);

    const { data: previousAssignments } = await supabase
      .from("locker_assignments")
      .select("locker_id")
      .eq("member_id", memberId)
      .is("released_at", null);

    await supabase
      .from("locker_assignments")
      .update({ released_at: now })
      .eq("member_id", memberId)
      .is("released_at", null);

    const { error: assignmentError } = await supabase
      .from("locker_assignments")
      .insert({
        locker_id: id,
        member_id: memberId,
        assigned_by: session.userId,
      });

    if (assignmentError) throw assignmentError;

    const previousLockerIds = [
      ...new Set(
        ((previousAssignments ?? []) as { locker_id: string }[])
          .map((item) => item.locker_id)
          .filter((lockerId) => lockerId && lockerId !== id),
      ),
    ];

    if (previousLockerIds.length > 0) {
      await supabase
        .from("lockers")
        .update({ status: "available" })
        .in("id", previousLockerIds);
    }

    await supabase.from("lockers").update({ status: "assigned" }).eq("id", id);

    if (
      occupiedAssignment?.member_id &&
      occupiedAssignment.member_id !== memberId
    ) {
      await supabase.from("locker_requests").insert({
        requester_id: occupiedAssignment.member_id,
        request_type: "release",
        current_locker_id: id,
        reason: "관리자 배정 해제",
        status: "approved",
        processed_by: session.userId,
        processed_at: now,
      });
    }

    await supabase.from("locker_requests").insert({
      requester_id: memberId,
      request_type: previousLockerIds.length > 0 ? "move" : "assign",
      preferred_locker_id: id,
      current_locker_id: previousLockerIds[0] ?? null,
      reason: "관리자 직접 배정",
      status: "approved",
      processed_by: session.userId,
      processed_at: now,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    console.error("PUT /api/lockers/[id]/assignment error:", error);
    return NextResponse.json(
      { error: "사물함 배정에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("locker:write");
    const { id } = await params;
    const supabase = createServiceClient() as any;
    const now = new Date().toISOString();

    const { data: locker } = await supabase
      .from("lockers")
      .select("status")
      .eq("id", id)
      .single();

    const { data: activeAssignment } = await supabase
      .from("locker_assignments")
      .select("member_id")
      .eq("locker_id", id)
      .is("released_at", null)
      .maybeSingle();

    const { error } = await supabase
      .from("locker_assignments")
      .update({ released_at: now })
      .eq("locker_id", id)
      .is("released_at", null);

    if (error) throw error;

    if (locker?.status !== "disabled") {
      await supabase
        .from("lockers")
        .update({ status: "available" })
        .eq("id", id);
    }

    if (activeAssignment?.member_id) {
      await supabase.from("locker_requests").insert({
        requester_id: activeAssignment.member_id,
        request_type: "release",
        current_locker_id: id,
        reason: "관리자 배정 해제",
        status: "approved",
        processed_by: session.userId,
        processed_at: now,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    console.error("DELETE /api/lockers/[id]/assignment error:", error);
    return NextResponse.json(
      { error: "사물함 배정 해제에 실패했습니다." },
      { status: 500 },
    );
  }
}
