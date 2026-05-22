import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertLockerRequestPayload } from "@/lib/facilities";
import { createServiceClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const client = supabase as any;
    const payload = assertLockerRequestPayload(await request.json());

    const { data: existingPending } = await client
      .from("locker_requests")
      .select("id")
      .eq("requester_id", session.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json(
        { error: "이미 처리 대기 중인 사물함 요청이 있습니다." },
        { status: 409 },
      );
    }

    const { data: currentAssignment } = await client
      .from("locker_assignments")
      .select("locker_id")
      .eq("member_id", session.id)
      .is("released_at", null)
      .maybeSingle();

    if (payload.requestType === "move" && !currentAssignment) {
      return NextResponse.json(
        { error: "이동 요청은 현재 배정된 사물함이 있을 때만 가능합니다." },
        { status: 400 },
      );
    }

    const { data, error } = await client
      .from("locker_requests")
      .insert({
        requester_id: session.id,
        request_type: payload.requestType,
        preferred_locker_id: payload.preferredLockerId,
        current_locker_id: currentAssignment?.locker_id ?? null,
        reason: payload.reason,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Locker request create error:", error);
      return NextResponse.json(
        { error: "사물함 요청 등록 실패" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/lockers/requests error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사물함 요청 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const requestId =
      typeof body.requestId === "string" ? body.requestId.trim() : "";

    if (!requestId) {
      return NextResponse.json(
        { error: "취소할 요청을 확인할 수 없습니다." },
        { status: 400 },
      );
    }

    const client = supabase as any;
    const { data, error } = await client
      .from("locker_requests")
      .update({
        status: "cancelled",
        processed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("requester_id", session.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) {
      console.error("Locker request cancel error:", error);
      return NextResponse.json(
        { error: "사물함 요청 취소 실패" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "취소 가능한 요청이 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/lockers/requests error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사물함 요청 취소 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
