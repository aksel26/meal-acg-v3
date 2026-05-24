"use client";

import { Fragment, useMemo, useState } from "react";
import dayjs from "dayjs";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
import { DatePicker } from "@repo/ui/src/date-picker";
import { DateRangePicker } from "@repo/ui/src/date-range-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/src/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Textarea } from "@repo/ui/src/textarea";
import { toast } from "@repo/ui/src/sonner";
import type {
  CompanyVehicle,
  VehicleAdminOverview,
  VehicleApplication,
  VehicleApplicationStatus,
  VehicleStatus,
} from "@/lib/vehicles-types";
import {
  VEHICLE_APPLICATION_STATUS_LABEL,
  VEHICLE_STATUS_LABEL,
  formatVehicleName,
} from "@/lib/vehicles-types";

type VehicleForm = {
  vehicleType: string;
  vehicleName: string;
  passengerCapacity: string;
  licensePlate: string;
  hasHipass: boolean;
  status: VehicleStatus;
  odometerKm: string;
  memo: string;
};

type ApplicationForm = {
  requestDate: string;
  department: string;
  applicantName: string;
  purpose: string;
  passengers: string;
  startAt: string;
  endAt: string;
  vehicleType: string;
  vehicleId: string;
  vehicleNameSnapshot: string;
  hasHipass: boolean;
  approverName: string;
  status: VehicleApplicationStatus;
  rejectReason: string;
  departurePlace: string;
  arrivalPlace: string;
  sameDayDistanceKm: string;
  totalDistanceKm: string;
  sharedReferences: string;
};

type VehicleRow = CompanyVehicle & {
  displayStatus: VehicleStatus;
};

const VEHICLE_APPROVAL_OVERLAP_MESSAGE =
  "같은 차량의 승인된 신청과 사용 시간이 겹쳐 모두 승인할 수 없습니다.";

export function AdminVehicleManagementClient({
  initialData,
}: {
  initialData: VehicleAdminOverview;
}) {
  const [data, setData] = useState(initialData);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    VehicleApplicationStatus | "all"
  >("all");
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<CompanyVehicle | null>(
    null,
  );
  const [editingApplication, setEditingApplication] =
    useState<VehicleApplication | null>(null);
  const [vehicleForm, setVehicleForm] = useState(createEmptyVehicleForm);
  const [applicationForm, setApplicationForm] = useState<ApplicationForm>(
    createEmptyApplicationForm,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredApplications = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return data.applications.filter((application) => {
      if (statusFilter !== "all" && application.status !== statusFilter)
        return false;
      if (!normalized) return true;
      return [
        application.department,
        application.applicant_name,
        application.purpose,
        application.passengers,
        application.vehicle_type,
        application.vehicle_name_snapshot,
        application.departure_place,
        application.arrival_place,
        application.shared_references,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized));
    });
  }, [data.applications, keyword, statusFilter]);

  const vehicleRows = useMemo<VehicleRow[]>(() => {
    const now = dayjs();
    return data.vehicles.map((vehicle) => ({
      ...vehicle,
      displayStatus: getVehicleDisplayStatus(vehicle, data.applications, now),
    }));
  }, [data.applications, data.vehicles]);

  const availableVehicleCount = vehicleRows.filter(
    (vehicle) => vehicle.displayStatus === "available",
  ).length;

  async function refresh() {
    const response = await fetch(`/api/vehicles?ts=${Date.now()}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "차량관리 정보를 불러오지 못했습니다.");
    }
    setData(payload);
  }

  async function submitVehicleForm() {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        editingVehicle ? `/api/vehicles/${editingVehicle.id}` : "/api/vehicles",
        {
          method: editingVehicle ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vehicleForm),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "차량 정보 저장 실패");
      toast.success(
        editingVehicle ? "차량 정보를 수정했습니다." : "차량을 추가했습니다.",
      );
      setVehicleDialogOpen(false);
      setEditingVehicle(null);
      setVehicleForm(createEmptyVehicleForm());
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "차량 정보 저장 실패",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteVehicle(vehicle: CompanyVehicle) {
    if (!confirm(`${formatVehicleName(vehicle)} 차량을 삭제할까요?`)) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "차량 정보 삭제 실패");
      toast.success("차량 정보를 삭제했습니다.");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "차량 정보 삭제 실패",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitApplicationForm() {
    if (!editingApplication) return;
    if (
      applicationForm.status === "approved" &&
      hasApprovedVehicleTimeConflict(data.applications, {
        id: editingApplication.id,
        vehicle_id: applicationForm.vehicleId || null,
        vehicle_type: applicationForm.vehicleType,
        vehicle_name_snapshot: applicationForm.vehicleNameSnapshot,
        start_at: applicationForm.startAt,
        end_at: applicationForm.endAt,
      })
    ) {
      toast.warning(VEHICLE_APPROVAL_OVERLAP_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/vehicle-applications/${editingApplication.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(applicationForm),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "차량 신청 내용 수정 실패");
      }
      toast.success("차량 신청 내용을 수정했습니다.");
      setApplicationDialogOpen(false);
      setEditingApplication(null);
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "차량 신청 내용 수정 실패",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateApplicationStatus(
    application: VehicleApplication,
    nextStatus: VehicleApplicationStatus,
  ) {
    if (application.status === nextStatus) return;

    if (
      nextStatus === "approved" &&
      hasApprovedVehicleTimeConflict(data.applications, application)
    ) {
      toast.warning(VEHICLE_APPROVAL_OVERLAP_MESSAGE);
      return;
    }

    const rejectReason =
      nextStatus === "rejected"
        ? application.reject_reason ||
          prompt("반려 사유를 입력해주세요.")?.trim() ||
          ""
        : "";

    if (nextStatus === "rejected" && !rejectReason) {
      toast.error("반려 사유를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/vehicle-applications/${application.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestDate: application.request_date,
            department: application.department,
            applicantName: application.applicant_name,
            purpose: application.purpose,
            passengers: application.passengers || "",
            startAt: application.start_at,
            endAt: application.end_at,
            vehicleType: application.vehicle_type,
            vehicleId: application.vehicle_id || "",
            vehicleNameSnapshot: application.vehicle_name_snapshot,
            hasHipass: application.has_hipass,
            approverName: application.approver_name,
            status: nextStatus,
            rejectReason,
            departurePlace: application.departure_place,
            arrivalPlace: application.arrival_place,
            sameDayDistanceKm:
              application.same_day_distance_km?.toString() || "",
            totalDistanceKm: application.total_distance_km?.toString() || "",
            sharedReferences: application.shared_references || "",
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "차량 신청 상태 변경 실패");
      }
      toast.success("차량 신청 상태를 변경했습니다.");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "차량 신청 상태 변경 실패",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreateVehicle() {
    setEditingVehicle(null);
    setVehicleForm(createEmptyVehicleForm());
    setVehicleDialogOpen(true);
  }

  function openEditVehicle(vehicle: CompanyVehicle) {
    setEditingVehicle(vehicle);
    setVehicleForm({
      vehicleType: vehicle.vehicle_type,
      vehicleName: vehicle.vehicle_name,
      passengerCapacity: String(vehicle.passenger_capacity),
      licensePlate: vehicle.license_plate || "",
      hasHipass: vehicle.has_hipass,
      status: vehicle.status,
      odometerKm: vehicle.odometer_km?.toString() || "",
      memo: vehicle.memo || "",
    });
    setVehicleDialogOpen(true);
  }

  function openEditApplication(application: VehicleApplication) {
    setEditingApplication(application);
    setApplicationForm({
      requestDate: application.request_date,
      department: application.department,
      applicantName: application.applicant_name,
      purpose: application.purpose,
      passengers: application.passengers || "",
      startAt: toDateTimeLocal(application.start_at),
      endAt: toDateTimeLocal(application.end_at),
      vehicleType: application.vehicle_type,
      vehicleId: application.vehicle_id || "",
      vehicleNameSnapshot: application.vehicle_name_snapshot,
      hasHipass: application.has_hipass,
      approverName: application.approver_name,
      status: application.status,
      rejectReason: application.reject_reason || "",
      departurePlace: application.departure_place,
      arrivalPlace: application.arrival_place,
      sameDayDistanceKm: application.same_day_distance_km?.toString() || "",
      totalDistanceKm: application.total_distance_km?.toString() || "",
      sharedReferences: application.shared_references || "",
    });
    setApplicationDialogOpen(true);
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl bg-white py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-semibold text-[#111111]">
            이용 가능한 차량 정보
            <span className="ml-1 font-medium text-slate-400">
              · 이용 가능 {availableVehicleCount}대 / 전체{" "}
              {data.vehicles.length}대
            </span>
          </h2>
          <Button onClick={openCreateVehicle}>
            <Plus className="mr-2 h-4 w-4" />
            차량 추가
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[110px]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[70px]" />
              <col className="w-[100px]" />
              <col className="w-[120px]" />
              <col className="w-[90px]" />
            </colgroup>
            <thead className="border-y border-slate-100 text-xs text-slate-500">
              <tr>
                <th className="px-2 py-2">차량종류</th>
                <th className="px-2 py-2">차량이름(인승)</th>
                <th className="px-2 py-2">차량번호</th>
                <th className="px-2 py-2">하이패스</th>
                <th className="px-2 py-2">상태</th>
                <th className="px-2 py-2">총 주행거리</th>
                <th className="w-px whitespace-nowrap px-1 py-2 text-right">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicleRows.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="px-2 py-2.5">{vehicle.vehicle_type}</td>
                  <td className="px-2 py-2.5 font-medium text-slate-950">
                    {formatVehicleName(vehicle)}
                  </td>
                  <td className="px-2 py-2.5 text-slate-600">
                    {vehicle.license_plate || "-"}
                  </td>
                  <td className="px-2 py-2.5">
                    {vehicle.has_hipass ? "Y" : "N"}
                  </td>
                  <td className="px-2 py-2.5">
                    <StatusPill
                      label={VEHICLE_STATUS_LABEL[vehicle.displayStatus]}
                      status={vehicle.displayStatus}
                    />
                  </td>
                  <td className="px-2 py-2.5 text-slate-600">
                    {vehicle.odometer_km == null
                      ? "-"
                      : `${vehicle.odometer_km.toLocaleString("ko-KR")}km`}
                  </td>
                  <td className="w-px whitespace-nowrap px-1 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => openEditVehicle(vehicle)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => deleteVehicle(vehicle)}
                      >
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-xl bg-white py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-semibold text-[#111111]">
            전체 신청 내용 및 사용 내역
            <span className="ml-1 font-medium text-slate-400">
              · 전체 사용 내역 {data.applications.length}건
            </span>
          </h2>
          <div className="grid gap-2 md:grid-cols-[220px_140px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="신청자, 목적, 차량 검색"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as VehicleApplicationStatus | "all",
                )
              }
            >
              <option value="all">전체 상태</option>
              <option value="pending">대기</option>
              <option value="approved">승인</option>
              <option value="rejected">반려</option>
              <option value="cancelled">취소</option>
            </select>
          </div>
        </div>
        <VehicleApplicationTable
          applications={filteredApplications}
          onEdit={openEditApplication}
          onStatusChange={updateApplicationStatus}
          isSubmitting={isSubmitting}
        />
      </section>

      <VehicleDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        form={vehicleForm}
        setForm={setVehicleForm}
        isEditing={Boolean(editingVehicle)}
        isSubmitting={isSubmitting}
        onSubmit={submitVehicleForm}
      />

      <ApplicationDialog
        open={applicationDialogOpen}
        onOpenChange={setApplicationDialogOpen}
        form={applicationForm}
        setForm={setApplicationForm}
        vehicles={data.vehicles}
        isSubmitting={isSubmitting}
        onSubmit={submitApplicationForm}
      />
    </div>
  );
}

function VehicleApplicationTable({
  applications,
  onEdit,
  onStatusChange,
  isSubmitting,
}: {
  applications: VehicleApplication[];
  onEdit: (application: VehicleApplication) => void;
  onStatusChange: (
    application: VehicleApplication,
    status: VehicleApplicationStatus,
  ) => void;
  isSubmitting: boolean;
}) {
  const [expandedHipassRows, setExpandedHipassRows] = useState<Set<string>>(
    () => new Set(),
  );

  function toggleHipassRow(applicationId: string) {
    setExpandedHipassRows((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) {
        next.delete(applicationId);
      } else {
        next.add(applicationId);
      }
      return next;
    });
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-xl bg-white px-6 py-10 text-center text-sm text-slate-500">
        조건에 맞는 차량 신청 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1552px] table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[32px]" />
          <col className="w-[86px]" />
          <col className="w-[90px]" />
          <col className="w-[80px]" />
          <col className="w-[110px]" />
          <col className="w-[90px]" />
          <col className="w-[170px]" />
          <col className="w-[90px]" />
          <col className="w-[120px]" />
          <col className="w-[64px]" />
          <col className="w-[80px]" />
          <col className="w-[86px]" />
          <col className="w-[100px]" />
          <col className="w-[130px]" />
          <col className="w-[82px]" />
          <col className="w-[82px]" />
          <col className="w-[86px]" />
          <col className="w-[100px]" />
          <col className="w-[120px]" />
          <col className="w-[100px]" />
          <col className="w-[52px]" />
        </colgroup>
        <thead className="border-y border-slate-100 text-xs text-slate-500">
          <tr>
            {[
              "",
              "신청일",
              "소속",
              "신청자",
              "사용목적",
              "동승자",
              "사용 기간",
              "차량종류",
              "차량이름(인승)",
              "하이패스",
              "승인자",
              "상태",
              "반려사유",
              "출발-도착지",
              "주행전 km",
              "주행 후 km",
              "주행거리 (km)",
              "비고",
              "편집일",
              "참조자(공유)",
              "관리",
            ].map((label) => (
              <th
                key={label}
                className={
                  label === ""
                    ? "px-1 py-2"
                    : label === "관리"
                      ? "w-px whitespace-nowrap px-1 py-2 text-right"
                      : "px-2 py-2"
                }
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {applications.map((application) => {
            const isHipassExpanded = expandedHipassRows.has(application.id);

            return (
              <Fragment key={application.id}>
                <tr>
                  <td className="px-1 py-2.5">
                    {application.has_hipass && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        onClick={() => toggleHipassRow(application.id)}
                        aria-label={
                          isHipassExpanded
                            ? "하이패스카드 작성 내역 접기"
                            : "하이패스카드 작성 내역 펼치기"
                        }
                        aria-expanded={isHipassExpanded}
                      >
                        {isHipassExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </td>
                  <td className="px-2 py-2.5">{application.request_date}</td>
                  <td className="px-2 py-2.5">{application.department}</td>
                  <td className="px-2 py-2.5 font-medium text-slate-950">
                    {application.applicant_name}
                  </td>
                  <td className="truncate px-2 py-2.5">{application.purpose}</td>
                  <td className="truncate px-2 py-2.5">
                    {application.passengers || "-"}
                  </td>
                  <td className="px-2 py-2.5 text-xs leading-5">
                    {formatPeriod(application.start_at, application.end_at)}
                  </td>
                  <td className="px-2 py-2.5">{application.vehicle_type}</td>
                  <td className="px-2 py-2.5">
                    {application.vehicle_name_snapshot}
                  </td>
                  <td className="px-2 py-2.5">
                    {application.has_hipass ? "Y" : "N"}
                  </td>
                  <td className="px-2 py-2.5">{application.approver_name}</td>
                  <td className="px-2 py-2.5">
                    <ApplicationStatusDropdown
                      application={application}
                      disabled={isSubmitting}
                      onStatusChange={onStatusChange}
                    />
                  </td>
                  <td className="truncate px-2 py-2.5">
                    {application.reject_reason || "-"}
                  </td>
                  <td className="truncate px-2 py-2.5">
                    {application.departure_place} - {application.arrival_place}
                  </td>
                  <td className="px-2 py-2.5">
                    {formatNullableKm(application.return_start_odometer_km)}
                  </td>
                  <td className="px-2 py-2.5">
                    {formatNullableKm(application.return_end_odometer_km)}
                  </td>
                  <td className="px-2 py-2.5">
                    {formatNullableKm(application.return_distance_km)}
                  </td>
                  <td className="truncate px-2 py-2.5">
                    {application.return_memo || "-"}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-slate-500">
                    {application.edited_at
                      ? dayjs(application.edited_at).format("YYYY-MM-DD HH:mm")
                      : "-"}
                  </td>
                  <td className="truncate px-2 py-2.5">
                    {application.shared_references || "-"}
                  </td>
                  <td className="w-px whitespace-nowrap px-1 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => onEdit(application)}
                    >
                      수정
                    </Button>
                  </td>
                </tr>
                {application.has_hipass && isHipassExpanded && (
                  <tr className="bg-slate-50/40 transition-colors">
                    <td colSpan={21} className="px-2 py-2">
                      <HipassNestedTable application={application} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HipassNestedTable({
  application,
}: {
  application: VehicleApplication;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
      <div className="px-3 pt-3 text-xs font-semibold text-slate-500">
        하이패스카드 작성 내역
      </div>
      <div className="overflow-x-auto px-3 pb-3 pt-2">
        <table className="w-full min-w-[900px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[90px]" />
            <col className="w-[100px]" />
            <col className="w-[100px]" />
            <col className="w-[150px]" />
            <col className="w-[150px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[160px]" />
          </colgroup>
          <thead className="border-y border-slate-100 text-xs text-slate-500">
            <tr>
              {[
                "구분",
                "일자",
                "사용자",
                "목적",
                "목적지",
                "충전액",
                "사용액",
                "잔액",
                "비고",
              ].map((label) => (
                <th key={label} className="px-2 py-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-2 py-2.5">통행료</td>
              <td className="px-2 py-2.5">
                {dayjs(application.start_at).format("YYYY-MM-DD")}
              </td>
              <td className="px-2 py-2.5 font-medium text-slate-950">
                {application.applicant_name}
              </td>
              <td className="truncate px-2 py-2.5">
                {application.purpose}
              </td>
              <td className="truncate px-2 py-2.5">
                {application.departure_place} - {application.arrival_place}
              </td>
              <td className="px-2 py-2.5">-</td>
              <td className="px-2 py-2.5">-</td>
              <td className="px-2 py-2.5">-</td>
              <td className="truncate px-2 py-2.5">
                {application.return_memo || "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApplicationStatusDropdown({
  application,
  disabled,
  onStatusChange,
}: {
  application: VehicleApplication;
  disabled: boolean;
  onStatusChange: (
    application: VehicleApplication,
    status: VehicleApplicationStatus,
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const statusOptions: VehicleApplicationStatus[] = [
    "pending",
    "approved",
    "rejected",
    "cancelled",
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          asChild
          variant="outline"
          className={`min-w-[72px] cursor-pointer justify-center gap-1.5 ${getVehicleApplicationStatusBadgeClass(
            application.status,
          )}`}
        >
          <button type="button" disabled={disabled}>
            {VEHICLE_APPLICATION_STATUS_LABEL[application.status]}
            <ChevronDown className="h-3 w-3" />
          </button>
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-32 p-1">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            disabled={disabled || application.status === status}
            onClick={() => {
              setOpen(false);
              onStatusChange(application, status);
            }}
            className="flex h-8 w-full items-center rounded-sm px-2 text-left text-xs text-slate-700 outline-none hover:bg-slate-100 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-400"
          >
            {VEHICLE_APPLICATION_STATUS_LABEL[status]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function getVehicleApplicationStatusBadgeClass(
  status: VehicleApplicationStatus,
) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "cancelled":
      return "border-slate-200 bg-slate-50 text-slate-500";
    case "pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function VehicleDialog({
  open,
  onOpenChange,
  form,
  setForm,
  isEditing,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: VehicleForm;
  setForm: React.Dispatch<React.SetStateAction<VehicleForm>>;
  isEditing: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5">
          <DialogTitle className="text-base font-semibold text-slate-950">
            {isEditing ? "차량 정보 수정" : "차량 추가"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[72vh] gap-5 overflow-y-auto px-6 py-5">
          <DialogSection title="기본 정보" columns="md:grid-cols-6">
            <FormField label="차량종류" required className="md:col-span-2">
              <Input
                value={form.vehicleType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleType: event.target.value,
                  }))
                }
                placeholder="예: 승용차"
              />
            </FormField>
            <FormField label="차량이름" required className="md:col-span-2">
              <Input
                value={form.vehicleName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleName: event.target.value,
                  }))
                }
                placeholder="예: 카니발"
              />
            </FormField>
            <FormField label="인승" required className="md:col-span-2">
              <Input
                value={form.passengerCapacity}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    passengerCapacity: event.target.value,
                  }))
                }
                placeholder="인승"
                type="number"
                min="1"
              />
            </FormField>
            <FormField label="차량번호" className="md:col-span-3">
              <Input
                value={form.licensePlate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    licensePlate: event.target.value,
                  }))
                }
                placeholder="예: 12가 3456"
              />
            </FormField>
            <FormField label="총 주행거리" className="md:col-span-3">
              <Input
                value={form.odometerKm}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    odometerKm: event.target.value,
                  }))
                }
                placeholder="km"
                type="number"
                min="0"
              />
            </FormField>
          </DialogSection>

          <DialogSection title="운영 설정" columns="md:grid-cols-[1fr_1fr]">
            <FormField label="상태" required>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as VehicleStatus,
                  }))
                }
              >
                <SelectTrigger className={FORM_SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">이용 가능</SelectItem>
                  <SelectItem value="in_use">사용 중</SelectItem>
                  <SelectItem value="maintenance">정비 중</SelectItem>
                  <SelectItem value="disabled">사용 중지</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="하이패스">
              <label className="flex h-10 items-center justify-between rounded-md border border-input bg-white px-3 text-sm text-slate-700">
                <span className="font-medium">
                  {form.hasHipass ? "있음" : "없음"}
                </span>
                <Checkbox
                  checked={form.hasHipass}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      hasHipass: checked === true,
                    }))
                  }
                  aria-label="하이패스 여부"
                />
              </label>
            </FormField>
          </DialogSection>

          <DialogSection title="메모" columns="grid-cols-1">
            <FormField label="관리 메모">
              <Textarea
                className="min-h-24 resize-none"
                value={form.memo}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    memo: event.target.value,
                  }))
                }
                placeholder="정비 일정, 비고 등"
              />
            </FormField>
          </DialogSection>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationDialog({
  open,
  onOpenChange,
  form,
  setForm,
  vehicles,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ApplicationForm;
  setForm: React.Dispatch<React.SetStateAction<ApplicationForm>>;
  vehicles: CompanyVehicle[];
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  function selectVehicle(vehicleId: string) {
    const nextVehicleId = vehicleId === DIRECT_VEHICLE_VALUE ? "" : vehicleId;
    const vehicle = vehicles.find((item) => item.id === nextVehicleId);
    setForm((prev) => ({
      ...prev,
      vehicleId: nextVehicleId,
      vehicleType: vehicle?.vehicle_type ?? prev.vehicleType,
      vehicleNameSnapshot: vehicle
        ? formatVehicleName(vehicle)
        : prev.vehicleNameSnapshot,
      hasHipass: vehicle?.has_hipass ?? prev.hasHipass,
    }));
  }

  function updateUseDateRange(range: { startDate: string; endDate: string }) {
    setForm((prev) => ({
      ...prev,
      startAt: mergeDateWithTime(range.startDate, prev.startAt, "09:00"),
      endAt: mergeDateWithTime(
        range.endDate || range.startDate,
        prev.endAt,
        "18:00",
      ),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5">
          <DialogTitle className="text-base font-semibold text-slate-950">
            차량 신청 내용 편집
          </DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[72vh] gap-5 overflow-y-auto px-6 py-5">
          <DialogSection title="신청자 정보" columns="md:grid-cols-4">
            <FormField label="신청일" required>
              <DatePicker
                value={form.requestDate}
                className={FORM_PICKER_TRIGGER_CLASS}
                modal
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    requestDate: value,
                  }))
                }
              />
            </FormField>
            <FormField label="소속" required>
              <Input
                value={form.department}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    department: event.target.value,
                  }))
                }
                placeholder="소속"
              />
            </FormField>
            <FormField label="신청자" required>
              <Input
                value={form.applicantName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    applicantName: event.target.value,
                  }))
                }
                placeholder="신청자"
              />
            </FormField>
            <FormField label="동승자">
              <Input
                value={form.passengers}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    passengers: event.target.value,
                  }))
                }
                placeholder="동승자"
              />
            </FormField>
          </DialogSection>

          <DialogSection title="차량 및 사용 기간" columns="md:grid-cols-4">
            <FormField label="시작 - 종료" required className="md:col-span-4">
              <DateRangePicker
                startDate={toDateOnly(form.startAt)}
                endDate={toDateOnly(form.endAt)}
                className={FORM_PICKER_TRIGGER_CLASS}
                modal
                onChange={updateUseDateRange}
              />
            </FormField>
            <FormField label="등록 차량" required>
              <Select
                value={form.vehicleId || DIRECT_VEHICLE_VALUE}
                onValueChange={selectVehicle}
              >
                <SelectTrigger className={FORM_SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="차량 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DIRECT_VEHICLE_VALUE}>
                    차량 직접 입력
                  </SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_type} · {formatVehicleName(vehicle)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="차량종류" required>
              <Input
                value={form.vehicleType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleType: event.target.value,
                  }))
                }
                placeholder="차량종류"
              />
            </FormField>
            <FormField label="차량이름(인승)" required>
              <Input
                value={form.vehicleNameSnapshot}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleNameSnapshot: event.target.value,
                  }))
                }
                placeholder="차량이름(인승)"
              />
            </FormField>
            <FormField label="하이패스">
              <label className="flex h-10 items-center justify-between rounded-md border border-input bg-white px-3 text-sm text-slate-700">
                <span className="font-medium">
                  {form.hasHipass ? "있음" : "없음"}
                </span>
                <Checkbox
                  checked={form.hasHipass}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      hasHipass: checked === true,
                    }))
                  }
                  aria-label="하이패스 여부"
                />
              </label>
            </FormField>
          </DialogSection>

          <DialogSection title="운행 정보" columns="md:grid-cols-4">
            <FormField label="출발지" required>
              <Input
                value={form.departurePlace}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    departurePlace: event.target.value,
                  }))
                }
                placeholder="출발지"
              />
            </FormField>
            <FormField label="도착지" required>
              <Input
                value={form.arrivalPlace}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    arrivalPlace: event.target.value,
                  }))
                }
                placeholder="도착지"
              />
            </FormField>
            <FormField label="당일 주행거리">
              <Input
                type="number"
                value={form.sameDayDistanceKm}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sameDayDistanceKm: event.target.value,
                  }))
                }
                placeholder="km"
              />
            </FormField>
            <FormField label="총 주행거리">
              <Input
                type="number"
                value={form.totalDistanceKm}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    totalDistanceKm: event.target.value,
                  }))
                }
                placeholder="km"
              />
            </FormField>
          </DialogSection>

          <DialogSection title="처리 정보" columns="md:grid-cols-3">
            <FormField label="승인자" required>
              <Input
                value={form.approverName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    approverName: event.target.value,
                  }))
                }
                placeholder="승인자"
              />
            </FormField>
            <FormField label="상태" required>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as VehicleApplicationStatus,
                  }))
                }
              >
                <SelectTrigger className={FORM_SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="approved">승인</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="참조자(공유)">
              <Input
                value={form.sharedReferences}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sharedReferences: event.target.value,
                  }))
                }
                placeholder="참조자(공유)"
              />
            </FormField>
          </DialogSection>

          <DialogSection title="상세 내용" columns="md:grid-cols-2">
            <FormField label="사용목적" required>
              <Textarea
                className="min-h-28 resize-none"
                value={form.purpose}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, purpose: event.target.value }))
                }
                placeholder="사용목적"
              />
            </FormField>
            <FormField label="반려사유">
              <Textarea
                className="min-h-28 resize-none"
                value={form.rejectReason}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    rejectReason: event.target.value,
                  }))
                }
                placeholder="반려 시 사유"
              />
            </FormField>
          </DialogSection>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DIRECT_VEHICLE_VALUE = "__direct_vehicle__";
const FORM_SELECT_TRIGGER_CLASS = "h-10 w-full bg-transparent";
const FORM_PICKER_TRIGGER_CLASS = "h-10 bg-transparent shadow-none";

function DialogSection({
  title,
  children,
  columns = "md:grid-cols-3",
}: {
  title: string;
  children: React.ReactNode;
  columns?: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-slate-500">
        {title}
      </h3>
      <div className={`grid gap-2 ${columns}`}>{children}</div>
    </section>
  );
}

function FormField({
  label,
  children,
  className = "",
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`grid gap-1 text-sm ${className}`}>
      <span className="text-xs font-medium text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function StatusPill({
  label,
  status,
}: {
  label: string;
  status: VehicleStatus;
}) {
  return (
    <Badge
      variant="secondary"
      className={`px-2 py-1 text-xs font-medium ${getVehicleStatusPillClass(
        status,
      )}`}
    >
      {label}
    </Badge>
  );
}

function getVehicleStatusPillClass(status: VehicleStatus) {
  if (status === "available") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

function createEmptyVehicleForm(): VehicleForm {
  return {
    vehicleType: "",
    vehicleName: "",
    passengerCapacity: "5",
    licensePlate: "",
    hasHipass: false,
    status: "available",
    odometerKm: "",
    memo: "",
  };
}

function createEmptyApplicationForm(): ApplicationForm {
  return {
    requestDate: dayjs().format("YYYY-MM-DD"),
    department: "",
    applicantName: "",
    purpose: "",
    passengers: "",
    startAt: "",
    endAt: "",
    vehicleType: "",
    vehicleId: "",
    vehicleNameSnapshot: "",
    hasHipass: false,
    approverName: "윤이나",
    status: "pending",
    rejectReason: "",
    departurePlace: "",
    arrivalPlace: "",
    sameDayDistanceKm: "",
    totalDistanceKm: "",
    sharedReferences: "",
  };
}

function getVehicleDisplayStatus(
  vehicle: CompanyVehicle,
  applications: VehicleApplication[],
  now: dayjs.Dayjs,
): VehicleStatus {
  if (vehicle.status === "maintenance" || vehicle.status === "disabled") {
    return vehicle.status;
  }

  const hasCurrentUsage = applications.some((application) => {
    if (application.vehicle_id !== vehicle.id) return false;
    if (application.status !== "approved") return false;
    return (
      !dayjs(application.start_at).isAfter(now) &&
      dayjs(application.end_at).isAfter(now)
    );
  });

  return hasCurrentUsage ? "in_use" : "available";
}

function hasApprovedVehicleTimeConflict(
  applications: VehicleApplication[],
  target: Pick<
    VehicleApplication,
    | "id"
    | "vehicle_id"
    | "vehicle_type"
    | "vehicle_name_snapshot"
    | "start_at"
    | "end_at"
  >,
) {
  const targetStart = dayjs(target.start_at);
  const targetEnd = dayjs(target.end_at);
  if (!targetStart.isValid() || !targetEnd.isValid()) return false;

  return applications.some((application) => {
    if (application.id === target.id) return false;
    if (application.status !== "approved") return false;
    if (!isSameVehicleApplication(application, target)) return false;

    return (
      dayjs(application.start_at).isBefore(targetEnd) &&
      dayjs(application.end_at).isAfter(targetStart)
    );
  });
}

function isSameVehicleApplication(
  application: Pick<
    VehicleApplication,
    "vehicle_id" | "vehicle_type" | "vehicle_name_snapshot"
  >,
  target: Pick<
    VehicleApplication,
    "vehicle_id" | "vehicle_type" | "vehicle_name_snapshot"
  >,
) {
  if (application.vehicle_id && target.vehicle_id) {
    return application.vehicle_id === target.vehicle_id;
  }

  return (
    application.vehicle_type.trim() === target.vehicle_type.trim() &&
    application.vehicle_name_snapshot.trim() ===
      target.vehicle_name_snapshot.trim()
  );
}

function toDateTimeLocal(value: string) {
  return dayjs(value).format("YYYY-MM-DDTHH:mm");
}

function toDateOnly(value: string) {
  if (!value) return "";
  return dayjs(value).format("YYYY-MM-DD");
}

function mergeDateWithTime(
  date: string,
  dateTime: string,
  fallbackTime: string,
) {
  if (!date) return "";
  const time = dateTime.includes("T")
    ? dateTime.split("T")[1]?.slice(0, 5)
    : "";
  return `${date}T${time || fallbackTime}`;
}

function formatPeriod(startAt: string, endAt: string) {
  return `${dayjs(startAt).format("YYYY-MM-DD HH:mm")} ~ ${dayjs(endAt).format("YYYY-MM-DD HH:mm")}`;
}

function formatNullableKm(value: number | null) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toLocaleString("ko-KR")}km`;
}
