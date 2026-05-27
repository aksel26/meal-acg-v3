import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  normalizeApplicationStatus,
  normalizeNumber,
  normalizeText,
} from "@/lib/vehicles";

const VEHICLE_APPROVAL_OVERLAP_MESSAGE =
  "같은 차량의 승인된 신청과 사용 시간이 겹쳐 모두 승인할 수 없습니다.";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("meal:write");
    const { id } = await params;
    const body = await request.json();
    const status = normalizeApplicationStatus(body.status);

    if (status === "rejected" && !normalizeText(body.rejectReason)) {
      return NextResponse.json(
        { error: "반려 사유를 입력해주세요." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient() as any;
    const { data: existingApplication } = await supabase
      .from("vehicle_applications")
      .select("vehicle_id")
      .eq("id", id)
      .maybeSingle();

    const { data: vehicle } = body.vehicleId
      ? await supabase
          .from("company_vehicles")
          .select(
            "id, vehicle_type, vehicle_name, passenger_capacity, has_hipass",
          )
          .eq("id", body.vehicleId)
          .maybeSingle()
      : { data: null };

    const vehicleNameSnapshot = vehicle
      ? `${vehicle.vehicle_name}(${vehicle.passenger_capacity}인승)`
      : normalizeText(body.vehicleNameSnapshot);
    const vehicleId = vehicle?.id ?? (normalizeText(body.vehicleId) || null);
    const startAt = normalizeText(body.startAt);
    const endAt = normalizeText(body.endAt);

    if (status === "approved" && vehicleId) {
      const { data: overlapped } = await supabase
        .from("vehicle_applications")
        .select("id")
        .neq("id", id)
        .eq("vehicle_id", vehicleId)
        .eq("status", "approved")
        .lt("start_at", endAt)
        .gt("end_at", startAt)
        .limit(1);

      if (overlapped?.length) {
        return NextResponse.json(
          { error: VEHICLE_APPROVAL_OVERLAP_MESSAGE },
          { status: 409 },
        );
      }
    }

    const { data, error } = await supabase
      .from("vehicle_applications")
      .update({
        request_date: normalizeText(body.requestDate),
        department: normalizeText(body.department),
        applicant_name: normalizeText(body.applicantName),
        purpose: normalizeText(body.purpose),
        passengers: normalizeText(body.passengers) || null,
        start_at: startAt,
        end_at: endAt,
        vehicle_type: vehicle?.vehicle_type ?? normalizeText(body.vehicleType),
        vehicle_id: vehicleId,
        vehicle_name_snapshot: vehicleNameSnapshot,
        has_hipass: vehicle?.has_hipass ?? Boolean(body.hasHipass),
        approver_name: normalizeText(body.approverName) || "윤이나",
        status,
        reject_reason:
          status === "rejected" ? normalizeText(body.rejectReason) : null,
        departure_place: normalizeText(body.departurePlace),
        arrival_place: normalizeText(body.arrivalPlace),
        same_day_distance_km: normalizeNumber(body.sameDayDistanceKm),
        total_distance_km: normalizeNumber(body.totalDistanceKm),
        edited_at: new Date().toISOString(),
        shared_references: normalizeText(body.sharedReferences) || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.error("Vehicle application update error:", error);
      return NextResponse.json(
        { error: "차량 신청 내용을 수정하지 못했습니다." },
        { status: 500 },
      );
    }

    if (
      existingApplication?.vehicle_id &&
      existingApplication.vehicle_id !== data.vehicle_id
    ) {
      await supabase
        .from("company_vehicles")
        .update({ status: "available" })
        .eq("id", existingApplication.vehicle_id);
    }

    return NextResponse.json(data);
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    console.error("PATCH /api/vehicle-applications/[id] error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "차량 신청 내용을 수정하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
