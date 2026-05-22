import { createServiceClient } from "@/lib/supabase/server";
import type {
  CompanyVehicle,
  VehicleAdminOverview,
  VehicleApplication,
  VehicleApplicationStatus,
  VehicleStatus,
} from "@/lib/vehicles-types";

export const VEHICLE_LOAD_ERROR_MESSAGE = "차량 정보를 불러오지 못했습니다.";

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeVehicleStatus(value: unknown): VehicleStatus {
  const status = normalizeText(value) || "available";
  if (
    status === "available" ||
    status === "in_use" ||
    status === "maintenance" ||
    status === "disabled"
  ) {
    return status;
  }
  throw new Error("차량 상태를 확인해주세요.");
}

export function normalizeApplicationStatus(
  value: unknown,
): VehicleApplicationStatus {
  const status = normalizeText(value) || "pending";
  if (
    status === "pending" ||
    status === "approved" ||
    status === "rejected" ||
    status === "cancelled"
  ) {
    return status;
  }
  throw new Error("신청 상태를 확인해주세요.");
}

export async function listVehicleAdminOverview(): Promise<VehicleAdminOverview> {
  const supabase = createServiceClient() as any;
  const [
    { data: vehicles, error: vehicleError },
    { data: applications, error: applicationError },
  ] = await Promise.all([
    supabase
      .from("company_vehicles")
      .select("*")
      .order("status", { ascending: true })
      .order("vehicle_type", { ascending: true })
      .order("vehicle_name", { ascending: true }),
    supabase
      .from("vehicle_applications")
      .select("*")
      .order("request_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (vehicleError) throw new Error(VEHICLE_LOAD_ERROR_MESSAGE);
  if (applicationError) throw new Error("차량 신청 내역을 불러오지 못했습니다.");

  return {
    vehicles: (vehicles ?? []) as CompanyVehicle[],
    applications: (applications ?? []) as VehicleApplication[],
  };
}
