import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import {
  assertVehicleApplicationPayload,
  formatVehicleName,
} from "@/lib/vehicles";

const VEHICLE_OVERLAP_MESSAGE =
  "이미 등록된 차량 신청 시간과 겹칩니다. 겹치는 시간을 피해 신청해주세요.";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const payload = assertVehicleApplicationPayload(body);
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const client = supabase as any;
    const { data: application, error: applicationError } = await client
      .from("vehicle_applications")
      .select("id, requester_id, vehicle_id, status, returned_at")
      .eq("id", id)
      .maybeSingle();

    if (applicationError || !application) {
      return NextResponse.json(
        { error: "차량 신청 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (application.requester_id !== session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (application.returned_at) {
      return NextResponse.json(
        { error: "이미 반납 처리된 신청은 수정할 수 없습니다." },
        { status: 409 },
      );
    }

    const requestedStatus = normalizeEditableStatus(body?.status);

    const { data: vehicle, error: vehicleError } = await client
      .from("company_vehicles")
      .select("*")
      .eq("id", payload.vehicleId)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: "선택한 차량을 찾을 수 없습니다." },
        { status: 400 },
      );
    }

    if (
      vehicle.status !== "available" &&
      vehicle.id !== application.vehicle_id
    ) {
      return NextResponse.json(
        { error: "선택한 차량은 현재 신청할 수 없습니다." },
        { status: 400 },
      );
    }

    if (requestedStatus !== "cancelled") {
      const { data: overlapped } = await client
        .from("vehicle_applications")
        .select("id")
        .eq("vehicle_id", payload.vehicleId)
        .neq("id", id)
        .in("status", ["pending", "approved"])
        .lt("start_at", payload.endAt)
        .gt("end_at", payload.startAt)
        .limit(1);

      if (overlapped?.length) {
        return NextResponse.json(
          { error: VEHICLE_OVERLAP_MESSAGE },
          { status: 409 },
        );
      }
    }

    const { data, error } = await client
      .from("vehicle_applications")
      .update({
        department: payload.department,
        purpose: payload.purpose,
        passengers: payload.passengers,
        start_at: payload.startAt,
        end_at: payload.endAt,
        vehicle_type: vehicle.vehicle_type,
        vehicle_id: vehicle.id,
        vehicle_name_snapshot: formatVehicleName(vehicle),
        has_hipass: vehicle.has_hipass,
        status: requestedStatus ?? application.status,
        departure_place: payload.departurePlace,
        arrival_place: payload.arrivalPlace,
        shared_references: payload.sharedReferences,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.error("Vehicle application update error:", error);
      return NextResponse.json(
        { error: "차량 신청 수정 실패" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/vehicle-applications/[id] error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "차량 신청 수정 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}

function normalizeEditableStatus(value: unknown) {
  return value === "cancelled" ? "cancelled" : null;
}
