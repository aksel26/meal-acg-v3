import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  assertVehicleApplicationPayload,
  formatVehicleName,
} from "@/lib/vehicles";
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
    const payload = assertVehicleApplicationPayload(await request.json());
    const { data: vehicle, error: vehicleError } = await client
      .from("company_vehicles")
      .select("*")
      .eq("id", payload.vehicleId)
      .eq("status", "available")
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: "선택한 차량은 현재 신청할 수 없습니다." },
        { status: 400 },
      );
    }

    const { data: overlapped } = await client
      .from("vehicle_applications")
      .select("id")
      .eq("vehicle_id", payload.vehicleId)
      .in("status", ["pending", "approved"])
      .lt("start_at", payload.endAt)
      .gt("end_at", payload.startAt)
      .limit(1);

    if (overlapped?.length) {
      return NextResponse.json(
        { error: "선택한 기간에 이미 차량 신청이 있습니다." },
        { status: 409 },
      );
    }

    const { data, error } = await client
      .from("vehicle_applications")
      .insert({
        requester_id: session.id,
        department: payload.department,
        applicant_name: session.fullName,
        purpose: payload.purpose,
        passengers: payload.passengers,
        start_at: payload.startAt,
        end_at: payload.endAt,
        vehicle_type: vehicle.vehicle_type,
        vehicle_id: vehicle.id,
        vehicle_name_snapshot: formatVehicleName(vehicle),
        has_hipass: vehicle.has_hipass,
        approver_name: "윤이나",
        departure_place: payload.departurePlace,
        arrival_place: payload.arrivalPlace,
        shared_references: payload.sharedReferences,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Vehicle application create error:", error);
      return NextResponse.json(
        { error: "차량 신청 등록 실패" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/vehicle-applications error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "차량 신청 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
