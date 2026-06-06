import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  normalizeNumber,
  normalizeText,
  normalizeVehicleStatus,
} from "@/lib/vehicles";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("vehicle:write");
    const { id } = await params;
    const body = await request.json();
    const vehicleType = normalizeText(body.vehicleType);
    const vehicleName = normalizeText(body.vehicleName);
    const passengerCapacity = Number(body.passengerCapacity || 0);

    if (!vehicleType || !vehicleName || passengerCapacity <= 0) {
      return NextResponse.json(
        { error: "차량종류, 차량이름, 인승을 입력해주세요." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient() as any;
    const { data, error } = await supabase
      .from("company_vehicles")
      .update({
        vehicle_type: vehicleType,
        vehicle_name: vehicleName,
        passenger_capacity: passengerCapacity,
        license_plate: normalizeText(body.licensePlate) || null,
        has_hipass: Boolean(body.hasHipass),
        status: normalizeVehicleStatus(body.status),
        odometer_km: normalizeNumber(body.odometerKm),
        memo: normalizeText(body.memo) || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "차량 정보를 수정하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    console.error("Error updating vehicle:", error);
    return NextResponse.json(
      { error: "차량 정보를 수정하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("vehicle:write");
    const { id } = await params;
    const supabase = createServiceClient() as any;
    const { error } = await supabase.from("company_vehicles").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "차량 정보를 삭제하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json(
      { error: "차량 정보를 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}
