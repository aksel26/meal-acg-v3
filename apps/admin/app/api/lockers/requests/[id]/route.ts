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
    const session = await requireAdminPermission("meal:write");
    const { id } = await params;
    const body = await request.json();
    const status = normalizeText(body.status);
    const lockerId = normalizeText(body.lockerId);
    const rejectReason = normalizeText(body.rejectReason);
    const processorId = session.userId;
    const supabase = createServiceClient() as any;

    const { data: lockerRequest, error: requestError } = await supabase
      .from("locker_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError || !lockerRequest) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }
    if (lockerRequest.status !== "pending") {
      return NextResponse.json({ error: "이미 처리된 요청입니다." }, { status: 409 });
    }

    if (status === "rejected") {
      if (!rejectReason) {
        return NextResponse.json(
          { error: "반려 사유를 입력해주세요." },
          { status: 400 },
        );
      }

      const { error } = await supabase
        .from("locker_requests")
        .update({
          status: "rejected",
          reject_reason: rejectReason,
          processed_by: processorId,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (status !== "approved") {
      return NextResponse.json(
        { error: "처리 상태를 확인해주세요." },
        { status: 400 },
      );
    }

    const targetLockerId = lockerId || lockerRequest.preferred_locker_id;
    if (!targetLockerId) {
      return NextResponse.json(
        { error: "배정할 사물함을 선택해주세요." },
        { status: 400 },
      );
    }

    const { data: occupied } = await supabase
      .from("locker_assignments")
      .select("id")
      .eq("locker_id", targetLockerId)
      .is("released_at", null)
      .maybeSingle();

    if (occupied) {
      return NextResponse.json(
        { error: "이미 배정된 사물함입니다." },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    await supabase
      .from("locker_assignments")
      .update({ released_at: now })
      .eq("member_id", lockerRequest.requester_id)
      .is("released_at", null);

    const { error: assignmentError } = await supabase
      .from("locker_assignments")
      .insert({
        locker_id: targetLockerId,
        member_id: lockerRequest.requester_id,
        assigned_by: processorId,
        memo: lockerRequest.reason,
      });

    if (assignmentError) throw assignmentError;

    await supabase
      .from("lockers")
      .update({ status: "assigned" })
      .eq("id", targetLockerId);

    if (lockerRequest.current_locker_id) {
      await supabase
        .from("lockers")
        .update({ status: "available" })
        .eq("id", lockerRequest.current_locker_id);
    }

    const { error: updateError } = await supabase
      .from("locker_requests")
      .update({
        status: "approved",
        processed_by: processorId,
        processed_at: now,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    console.error("PUT /api/lockers/requests/[id] error:", error);
    return NextResponse.json(
      { error: "사물함 요청 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
