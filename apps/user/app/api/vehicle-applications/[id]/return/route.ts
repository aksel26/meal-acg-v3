import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import { assertVehicleReturnPayload } from "@/lib/vehicles";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const payload = assertVehicleReturnPayload(await request.json());
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const client = supabase as any;
    const { data: application, error: fetchError } = await client
      .from("vehicle_applications")
      .select("id, requester_id, vehicle_id, status, returned_at")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: "차량 신청 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (application.requester_id !== session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (application.status !== "approved") {
      return NextResponse.json(
        { error: "승인된 차량 신청만 반납할 수 있습니다." },
        { status: 400 },
      );
    }

    if (application.returned_at) {
      return NextResponse.json(
        { error: "이미 반납 처리된 신청입니다." },
        { status: 409 },
      );
    }

    const { data, error } = await client
      .from("vehicle_applications")
      .update({
        return_start_odometer_km: payload.startOdometerKm,
        return_end_odometer_km: payload.endOdometerKm,
        return_distance_km: payload.distanceKm,
        returned_by_id: session.id,
        returned_by_name: session.fullName,
        returned_at: payload.returnedAt,
        return_memo: payload.memo,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.error("Vehicle return error:", error);
      return NextResponse.json(
        { error: "차량 반납 처리에 실패했습니다." },
        { status: 500 },
      );
    }

    if (application.vehicle_id) {
      await client
        .from("company_vehicles")
        .update({
          status: "available",
          odometer_km: payload.endOdometerKm,
        })
        .eq("id", application.vehicle_id);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/vehicle-applications/[id]/return error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "차량 반납 처리 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
