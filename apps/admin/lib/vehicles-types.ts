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
  created_at: string;
  updated_at: string;
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
  updated_at: string;
}

export interface VehicleAdminOverview {
  vehicles: CompanyVehicle[];
  applications: VehicleApplication[];
}

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

export function formatVehicleName(vehicle: {
  vehicle_name: string;
  passenger_capacity: number;
}) {
  return `${vehicle.vehicle_name}(${vehicle.passenger_capacity}인승)`;
}
