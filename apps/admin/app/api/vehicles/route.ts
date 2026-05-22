import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  listVehicleAdminOverview,
  normalizeNumber,
  normalizeText,
  normalizeVehicleStatus,
} from "@/lib/vehicles";

export async function GET() {
  try {
    await requireAdminPermission("meal:read");
    return NextResponse.json(await listVehicleAdminOverview());
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    console.error("GET /api/vehicles error:", error);
    return NextResponse.json(
      { error: "차량관리 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminPermission("meal:write");
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
      .insert({
        vehicle_type: vehicleType,
        vehicle_name: vehicleName,
        passenger_capacity: passengerCapacity,
        license_plate: normalizeText(body.licensePlate) || null,
        has_hipass: Boolean(body.hasHipass),
        status: normalizeVehicleStatus(body.status),
        odometer_km: normalizeNumber(body.odometerKm),
        memo: normalizeText(body.memo) || null,
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "차량 정보를 추가하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "차량 정보를 추가하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
