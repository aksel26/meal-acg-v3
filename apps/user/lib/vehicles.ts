import { createServiceClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/auth";

export type VehicleStatus = "available" | "in_use" | "maintenance" | "disabled";
export type VehicleApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface CompanyVehicle {
  id: string;
  vehicle_type: string;
  vehicle_name: string;
  passenger_capacity: number;
  license_plate: string | null;
  has_hipass: boolean;
  status: VehicleStatus;
  odometer_km: number | null;
  memo: string | null;
}

export interface VehicleApplication {
  id: string;
  request_date: string;
  requester_id: string | null;
  department: string;
  applicant_name: string;
  purpose: string;
  passengers: string | null;
  start_at: string;
  end_at: string;
  vehicle_type: string;
  vehicle_id: string | null;
  vehicle_name_snapshot: string;
  has_hipass: boolean;
  approver_name: string;
  status: VehicleApplicationStatus;
  reject_reason: string | null;
  departure_place: string;
  arrival_place: string;
  same_day_distance_km: number | null;
  total_distance_km: number | null;
  return_start_odometer_km: number | null;
  return_end_odometer_km: number | null;
  return_distance_km: number | null;
  returned_by_id: string | null;
  returned_by_name: string | null;
  returned_at: string | null;
  return_memo: string | null;
  edited_at: string | null;
  shared_references: string | null;
  created_at: string;
}

export interface VehicleUserState {
  vehicles: CompanyVehicle[];
  myApplications: VehicleApplication[];
  allApplications: VehicleApplication[];
  defaultDepartment: string;
}

export const VEHICLE_LOAD_ERROR_MESSAGE = "차량 정보를 불러오지 못했습니다.";
const VEHICLE_TIMEZONE_OFFSET = "+09:00";
const TIMEZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  available: "이용 가능",
  in_use: "사용 중",
  maintenance: "정비 중",
  disabled: "사용 중지",
};

export const VEHICLE_APPLICATION_STATUS_LABEL: Record<
  VehicleApplicationStatus,
  string
> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
};

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatVehicleName(vehicle: {
  vehicle_name: string;
  passenger_capacity: number;
}) {
  return `${vehicle.vehicle_name}(${vehicle.passenger_capacity}인승)`;
}

export async function listVehiclesForUser(
  session: SessionUser,
  selectedDate = getVehicleTodayDate(),
): Promise<VehicleUserState> {
  const supabase = createServiceClient();
  if (!supabase) throw new Error("데이터베이스 연결 오류");

  const client = supabase as any;
  const dayStart = `${selectedDate}T00:00:00${VEHICLE_TIMEZONE_OFFSET}`;
  const dayEnd = `${selectedDate}T23:59:59${VEHICLE_TIMEZONE_OFFSET}`;
  const [
    { data: vehicles, error: vehicleError },
    { data: myApplications, error: myError },
    { data: allApplications, error: allError },
    { data: member },
  ] = await Promise.all([
    client
      .from("company_vehicles")
      .select("*")
      .order("status", { ascending: true })
      .order("vehicle_type", { ascending: true })
      .order("vehicle_name", { ascending: true }),
    client
      .from("vehicle_applications")
      .select("*")
      .eq("requester_id", session.id)
      .order("request_date", { ascending: false })
      .limit(50),
    client
      .from("vehicle_applications")
      .select("*")
      .lt("start_at", dayEnd)
      .gt("end_at", dayStart)
      .order("start_at", { ascending: true })
      .limit(500),
    client
      .from("members")
      .select("team:teams!members_team_id_fkey(name)")
      .eq("id", session.id)
      .maybeSingle(),
  ]);

  if (vehicleError) throw new Error(VEHICLE_LOAD_ERROR_MESSAGE);
  if (myError) throw new Error("나의 차량 신청 이력을 불러오지 못했습니다.");
  if (allError) throw new Error("전체 차량 신청 내역을 불러오지 못했습니다.");

  return {
    vehicles: (vehicles ?? []) as CompanyVehicle[],
    myApplications: (myApplications ?? []) as VehicleApplication[],
    allApplications: (allApplications ?? []) as VehicleApplication[],
    defaultDepartment: getTeamName(member?.team) || "",
  };
}

function getTeamName(
  team: { name: string | null } | { name: string | null }[] | null | undefined,
) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0]?.name ?? null;
  return team.name;
}

export function assertVehicleApplicationPayload(body: unknown) {
  const record = body as Record<string, unknown>;
  const department = normalizeText(record.department);
  const purpose = normalizeText(record.purpose);
  const startAt = normalizeText(record.startAt);
  const endAt = normalizeText(record.endAt);
  const vehicleId = normalizeText(record.vehicleId);
  const departurePlace = normalizeText(record.departurePlace);
  const arrivalPlace = normalizeText(record.arrivalPlace);

  if (!department) throw new Error("소속을 입력해주세요.");
  if (!purpose) throw new Error("사용목적을 입력해주세요.");
  if (!startAt || !endAt) throw new Error("사용 기간을 입력해주세요.");
  if (!vehicleId) throw new Error("이용 가능한 차량을 선택해주세요.");
  if (!departurePlace || !arrivalPlace) {
    throw new Error("출발지와 도착지를 입력해주세요.");
  }
  const normalizedStartAt = normalizeVehicleDateTime(startAt);
  const normalizedEndAt = normalizeVehicleDateTime(endAt);

  if (
    new Date(normalizedEndAt).getTime() <=
    new Date(normalizedStartAt).getTime()
  ) {
    throw new Error("반납 일시는 출발 일시 이후여야 합니다.");
  }

  return {
    department,
    purpose,
    startAt: normalizedStartAt,
    endAt: normalizedEndAt,
    vehicleId,
    departurePlace,
    arrivalPlace,
    passengers: normalizeText(record.passengers) || null,
    sharedReferences: normalizeText(record.sharedReferences) || null,
  };
}

function normalizeVehicleDateTime(value: string) {
  if (TIMEZONE_PATTERN.test(value)) return value;
  const valueWithSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00`
    : value;
  return `${valueWithSeconds}${VEHICLE_TIMEZONE_OFFSET}`;
}

function getVehicleTodayDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function assertVehicleReturnPayload(body: unknown) {
  const record = body as Record<string, unknown>;
  const startOdometerKm = normalizeNumber(record.startOdometerKm);
  const endOdometerKm = normalizeNumber(record.endOdometerKm);
  const returnedAt = normalizeText(record.returnedAt);

  if (startOdometerKm === null) {
    throw new Error("주행 전 km수를 입력해주세요.");
  }
  if (endOdometerKm === null) {
    throw new Error("주행 후 km수를 입력해주세요.");
  }
  if (endOdometerKm < startOdometerKm) {
    throw new Error("주행 후 km수는 주행 전 km수보다 작을 수 없습니다.");
  }
  if (!returnedAt) {
    throw new Error("반납 일시를 입력해주세요.");
  }

  return {
    startOdometerKm,
    endOdometerKm,
    distanceKm: Number((endOdometerKm - startOdometerKm).toFixed(1)),
    returnedAt,
    memo: normalizeText(record.memo) || null,
  };
}
