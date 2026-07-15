"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { Button } from "@repo/ui/src/button";
import { DateRangePicker } from "@repo/ui/src/date-range-picker";
import { DatePicker } from "@repo/ui/src/date-picker";
import { Label } from "@repo/ui/src/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Textarea } from "@repo/ui/src/textarea";
import { toast } from "@repo/ui/src/sonner";
import type {
  CompanyVehicle,
  VehicleApplication,
  VehicleUserState,
} from "@/lib/vehicles";
import {
  VEHICLE_LOAD_ERROR_MESSAGE,
  VEHICLE_APPLICATION_STATUS_LABEL,
  VEHICLE_STATUS_LABEL,
  formatVehicleName,
} from "@/lib/vehicles";

dayjs.extend(utc);
dayjs.extend(timezone);

type ApplicationForm = {
  department: string;
  purpose: string;
  passengers: string;
  startAt: string;
  endAt: string;
  vehicleId: string;
  departurePlace: string;
  arrivalPlace: string;
  sharedReferences: string;
  status: VehicleApplication["status"];
};

type ReturnForm = {
  startOdometerKm: string;
  endOdometerKm: string;
  returnedAt: string;
  memo: string;
};

type DialogMode =
  | { type: "create" }
  | { type: "edit"; application: VehicleApplication };

function createEmptyReturnForm(): ReturnForm {
  return {
    startOdometerKm: "",
    endOdometerKm: "",
    returnedAt: dayjs().tz(VEHICLE_TIMEZONE).format("YYYY-MM-DDTHH:mm"),
    memo: "",
  };
}

const TIMELINE_START_HOUR = 8;
const TIMELINE_END_HOUR = 22;
const SLOT_MINUTES = 30;
const SLOT_COUNT =
  ((TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60) / SLOT_MINUTES;
const VEHICLE_LABEL_WIDTH = 152;
const HEADER_HEIGHT = 38;
const ROW_HEIGHT = 58;
const VEHICLE_TIMEZONE = "Asia/Seoul";
const DEFAULT_VEHICLE_APPROVER_NAME = "P&C팀 윤이나";
const DEFAULT_VEHICLE_SHARED_REFERENCES = "홍세영";

type DragState =
  | { mode: "idle" }
  | { mode: "create"; vehicleId: string; startSlot: number; endSlot: number };

export function UserVehicleApplicationClient({
  initialData,
  userName,
}: {
  initialData: VehicleUserState;
  userName: string;
}) {
  const [data, setData] = useState(initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>({ type: "create" });
  const [selectedDate, setSelectedDate] = useState(() =>
    dayjs().format("YYYY-MM-DD"),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<VehicleApplication | null>(
    null,
  );
  const [isReturning, setIsReturning] = useState(false);
  const [form, setForm] = useState(() =>
    createEmptyApplicationForm(initialData.defaultDepartment),
  );
  const [returnForm, setReturnForm] = useState<ReturnForm>(() =>
    createEmptyReturnForm(),
  );

  const availableVehicles = data.vehicles.filter(
    (vehicle) => vehicle.status === "available",
  );
  const selectableVehicles = useMemo(() => {
    if (dialogMode.type !== "edit") return availableVehicles;
    const currentVehicle = data.vehicles.find(
      (vehicle) => vehicle.id === dialogMode.application.vehicle_id,
    );
    if (!currentVehicle) return availableVehicles;
    if (availableVehicles.some((vehicle) => vehicle.id === currentVehicle.id)) {
      return availableVehicles;
    }
    return [currentVehicle, ...availableVehicles];
  }, [availableVehicles, data.vehicles, dialogMode]);
  const timelineApplications = useMemo(
    () => data.allApplications,
    [data.allApplications],
  );

  const refresh = useCallback(async (date: string) => {
    const params = new URLSearchParams({
      ts: String(Date.now()),
      date,
    });
    const response = await fetch(`/api/vehicles?${params.toString()}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || VEHICLE_LOAD_ERROR_MESSAGE);
    }
    setData(payload);
  }, []);

  useEffect(() => {
    void refresh(selectedDate);
  }, [refresh, selectedDate]);

  async function submitApplication() {
    setIsSubmitting(true);
    const submittedDate = getDatePart(form.startAt);
    try {
      const isEdit = dialogMode.type === "edit";
      const response = await fetch(
        isEdit
          ? `/api/vehicle-applications/${dialogMode.application.id}`
          : "/api/vehicle-applications",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEdit ? "차량 신청 수정 실패" : "차량 신청 등록 실패"),
        );
      }
      toast.success(
        isEdit ? "차량 신청을 수정했습니다." : "차량 신청을 등록했습니다.",
      );
      setDialogOpen(false);
      setDialogMode({ type: "create" });
      setForm(createEmptyApplicationForm(data.defaultDepartment));
      setSelectedDate(submittedDate);
      await refresh(submittedDate);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "차량 신청 저장 실패",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancelApplication() {
    if (dialogMode.type !== "edit") return;
    setIsSubmitting(true);
    const submittedDate = getDatePart(form.startAt);
    try {
      const response = await fetch(
        `/api/vehicle-applications/${dialogMode.application.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, status: "cancelled" }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "차량 신청 취소 실패");
      toast.success("차량 신청을 취소했습니다.");
      setDialogOpen(false);
      setDialogMode({ type: "create" });
      setForm(createEmptyApplicationForm(data.defaultDepartment));
      await refresh(submittedDate);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "차량 신청 취소 실패",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openDialog(vehicleId?: string, startAt?: string, endAt?: string) {
    setDialogMode({ type: "create" });
    setForm((prev) => ({
      ...prev,
      vehicleId: vehicleId || prev.vehicleId || availableVehicles[0]?.id || "",
      startAt: startAt || prev.startAt,
      endAt: endAt || prev.endAt,
    }));
    setDialogOpen(true);
  }

  function openEditDialog(application: VehicleApplication) {
    setDialogMode({ type: "edit", application });
    setForm(applicationToForm(application));
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setDialogMode({ type: "create" });
      setForm(createEmptyApplicationForm(data.defaultDepartment));
    }
  }

  async function submitReturn() {
    if (!returnTarget) return;
    setIsReturning(true);
    try {
      const response = await fetch(
        `/api/vehicle-applications/${returnTarget.id}/return`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startOdometerKm: returnForm.startOdometerKm,
            endOdometerKm: returnForm.endOdometerKm,
            returnedAt: dateTimeLocalToIso(returnForm.returnedAt),
            memo: returnForm.memo,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "차량 반납 처리 실패");
      toast.success("차량을 반납했습니다.");
      setReturnDialogOpen(false);
      setReturnTarget(null);
      setReturnForm(createEmptyReturnForm());
      await refresh(selectedDate);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "차량 반납 처리 실패",
      );
    } finally {
      setIsReturning(false);
    }
  }

  function openReturnDialog(application: VehicleApplication) {
    const startOdometerKm = getDefaultStartOdometer(data, application);
    setReturnTarget(application);
    setReturnForm({
      startOdometerKm: formatOdometerInput(startOdometerKm),
      endOdometerKm: "",
      returnedAt: dayjs().tz(VEHICLE_TIMEZONE).format("YYYY-MM-DDTHH:mm"),
      memo: "",
    });
    setReturnDialogOpen(true);
  }

  const returnDistanceKm = getDistanceKm(
    returnForm.startOdometerKm,
    returnForm.endOdometerKm,
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
        <p>
          ※ 차량 이용이 필요하신 경우 사용일 1주일 전까지 신청서를 작성해
          승인을 받아주세요. (회사차량/렌터카/개인차량 동일)
        </p>
        <p>
          차량은 회사차량을 우선적으로 이용해주시고, 차량 내부에 비치된
          회사차량 사용거리를 꼭 작성해주세요.
        </p>
        <p>26.05.18부터 아이오닉은 장기대여로 인해 사용이 어렵습니다.</p>
        <div className="mt-3">
          <p>주차는 지하 3층 회사 화물 엘레베이터 쪽을 이용해주세요.</p>
          <p>
            전기차 충전 구역(초록색)은 완충 이후 14시간 이상 계속 주차 시
            과태료가 부과될 수 있으며, 회색칸은 상시 주차 가능합니다.
          </p>
        </div>
        <p className="mt-3">
          승인권자는 P&C팀 윤이나, 참조자는 홍세영으로 설정해주세요.
        </p>
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">
                차량 신청 타임라인
              </h2>
              <DatePicker
                className="h-9 w-[152px] shrink-0 justify-center px-3 text-xs"
                value={selectedDate}
                onChange={setSelectedDate}
                modal
              />
            </div>
            <VehicleTimeline
              vehicles={data.vehicles}
              applications={timelineApplications}
              selectedDate={selectedDate}
              onCreateRange={(vehicleId, startAt, endAt) =>
                openDialog(vehicleId, startAt, endAt)
              }
              onClickApplication={openEditDialog}
            />
          </section>

          <HistoryPanel
            applications={data.myApplications}
            onReturn={openReturnDialog}
          />
        </div>

        <section className="rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">
              전체 인원 신청 내역
            </h2>
            <span className="text-xs text-slate-400">
              {data.allApplications.length}건
            </span>
          </div>
          <ApplicationList applications={data.allApplications} compact />
        </section>
      </section>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl rounded-2xl p-0">
          <DialogHeader>
            <div className="px-5 pt-5">
              <DialogTitle className="text-lg font-semibold text-slate-950">
                {dialogMode.type === "edit" ? "차량 신청 수정" : "사내 차량 신청"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                {dialogMode.type === "edit"
                  ? "신청한 사용 기간과 이동 정보를 수정합니다."
                  : "사용 기간과 차량, 이동 정보를 입력해 신청을 등록합니다."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="max-h-[72vh] space-y-10 overflow-y-auto px-5 py-4">
            <section className="grid gap-3 sm:grid-cols-3">
              <Field label="신청자">
                <Input
                  value={
                    dialogMode.type === "edit"
                      ? dialogMode.application.applicant_name
                      : userName
                  }
                  readOnly
                  aria-label="신청자"
                  className="h-10 bg-white text-slate-600"
                />
              </Field>
              <Field label="소속">
                <Input
                  value={form.department}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      department: event.target.value,
                    }))
                  }
                  placeholder="소속"
                  className="h-10 bg-white"
                />
              </Field>
              <Field label="승인권자">
                <Input
                  value={
                    dialogMode.type === "edit"
                      ? dialogMode.application.approver_name
                      : DEFAULT_VEHICLE_APPROVER_NAME
                  }
                  readOnly
                  aria-label="승인권자"
                  className="h-10 bg-white text-slate-600"
                />
              </Field>
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  사용 기간
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  날짜 범위를 먼저 선택한 뒤 출발/반납 시간을 입력합니다.
                </p>
              </div>
              <DateRangePicker
                startDate={getDatePart(form.startAt)}
                endDate={getDatePart(form.endAt)}
                modal
                placeholder="사용 날짜 범위 선택"
                className="h-10 border-slate-200 bg-white text-sm"
                onChange={(range) => {
                  const nextStartDate =
                    range.startDate || getDatePart(form.startAt);
                  const nextEndDate =
                    range.endDate || range.startDate || getDatePart(form.endAt);
                  setForm((prev) => ({
                    ...prev,
                    startAt: combineDateTime(
                      nextStartDate,
                      getTimePart(prev.startAt),
                    ),
                    endAt: combineDateTime(
                      nextEndDate,
                      getTimePart(prev.endAt),
                    ),
                  }));
                }}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="출발 시간">
                  <Input
                    type="time"
                    value={getTimePart(form.startAt)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        startAt: combineDateTime(
                          getDatePart(prev.startAt),
                          event.target.value,
                        ),
                      }))
                    }
                    className="h-10 bg-white"
                  />
                </Field>
                <Field label="반납 시간">
                  <Input
                    type="time"
                    value={getTimePart(form.endAt)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        endAt: combineDateTime(
                          getDatePart(prev.endAt),
                          event.target.value,
                        ),
                      }))
                    }
                    className="h-10 bg-white"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <Field label="이용 차량">
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors hover:bg-slate-50 focus:border-slate-300"
                  value={form.vehicleId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      vehicleId: event.target.value,
                    }))
                  }
                >
                  <option value="">이용 가능한 차량 선택</option>
                  {selectableVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_type} · {formatVehicleName(vehicle)} ·{" "}
                      {vehicle.has_hipass ? "하이패스" : "하이패스 없음"}
                    </option>
                  ))}
                </select>
              </Field>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <Field label="동승자">
                <Input
                  value={form.passengers}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      passengers: event.target.value,
                    }))
                  }
                  placeholder="동승자"
                  className="h-10 bg-white"
                />
              </Field>
              <Field label="참조자">
                <Input
                  value={form.sharedReferences}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sharedReferences: event.target.value,
                    }))
                  }
                  placeholder="참조자(공유)"
                  className="h-10 bg-white"
                />
              </Field>
              <Field label="출발지">
                <Input
                  value={form.departurePlace}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      departurePlace: event.target.value,
                    }))
                  }
                  placeholder="출발지"
                  className="h-10 bg-white"
                />
              </Field>
              <Field label="도착지">
                <Input
                  value={form.arrivalPlace}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      arrivalPlace: event.target.value,
                    }))
                  }
                  placeholder="도착지"
                  className="h-10 bg-white"
                />
              </Field>
              <Field label="사용목적" className="sm:col-span-2">
                <Textarea
                  className="min-h-24 bg-white"
                  value={form.purpose}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      purpose: event.target.value,
                    }))
                  }
                  placeholder="사용목적"
                />
              </Field>
            </section>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 px-5 pb-5 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              onClick={submitApplication}
              disabled={isSubmitting}
              className="h-10 w-full sm:w-auto"
            >
              {dialogMode.type === "edit" ? "수정 저장" : "신청 등록"}
            </Button>
            {dialogMode.type === "edit" && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {form.status !== "cancelled" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelApplication}
                    disabled={isSubmitting}
                    className="h-10 w-full sm:w-auto"
                  >
                    신청 취소
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0">
          <DialogHeader>
            <div className="px-5 pt-5">
              <DialogTitle className="text-lg font-semibold text-slate-950">
                차량 반납하기
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                주행거리와 반납 정보를 입력해 차량 반납을 완료합니다.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4">
            <section className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {returnTarget?.vehicle_name_snapshot || "차량"}
              </p>
              {returnTarget && (
                <p className="mt-1 text-xs text-slate-500">
                  {formatPeriod(returnTarget.start_at, returnTarget.end_at)}
                </p>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <Field label="주행 전 km">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={returnForm.startOdometerKm}
                  onChange={(event) =>
                    setReturnForm((prev) => ({
                      ...prev,
                      startOdometerKm: event.target.value,
                    }))
                  }
                  className="h-10"
                />
              </Field>
              <Field label="주행 후 km">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={returnForm.endOdometerKm}
                  onChange={(event) =>
                    setReturnForm((prev) => ({
                      ...prev,
                      endOdometerKm: event.target.value,
                    }))
                  }
                  className="h-10"
                />
              </Field>
              <div className="rounded-xl bg-slate-50 px-4 py-3 sm:col-span-2">
                <p className="text-xs font-semibold text-slate-500">거리수</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {returnDistanceKm === null ? "-" : `${returnDistanceKm} km`}
                </p>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <Field label="반납자">
                <Input value={userName} readOnly className="h-10 bg-slate-50" />
              </Field>
              <Field label="반납 일시">
                <Input
                  type="datetime-local"
                  value={returnForm.returnedAt}
                  onChange={(event) =>
                    setReturnForm((prev) => ({
                      ...prev,
                      returnedAt: event.target.value,
                    }))
                  }
                  className="h-10"
                />
              </Field>
              <Field label="비고" className="sm:col-span-2">
                <Textarea
                  value={returnForm.memo}
                  onChange={(event) =>
                    setReturnForm((prev) => ({
                      ...prev,
                      memo: event.target.value,
                    }))
                  }
                  placeholder="비고나 전달사항을 입력해주세요."
                  className="min-h-24"
                />
              </Field>
            </section>
          </div>
          <DialogFooter className="px-5 pb-5">
            <Button
              variant="outline"
              onClick={() => setReturnDialogOpen(false)}
              disabled={isReturning}
            >
              취소
            </Button>
            <Button onClick={submitReturn} disabled={isReturning}>
              반납하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryPanel({
  applications,
  onReturn,
}: {
  applications: VehicleApplication[];
  onReturn: (application: VehicleApplication) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">
          나의 신청 이력{" "}
          <span className="font-medium text-slate-400">
            · {applications.length}건
          </span>
        </h2>
      </div>
      <ApplicationList applications={applications} onReturn={onReturn} />
    </section>
  );
}

function ApplicationList({
  applications,
  compact = false,
  onReturn,
}: {
  applications: VehicleApplication[];
  compact?: boolean;
  onReturn?: (application: VehicleApplication) => void;
}) {
  if (applications.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        차량 신청 내역이 없습니다.
      </p>
    );
  }

  const sortedApplications = [...applications].sort(
    (a, b) => getApplicationSortTime(b) - getApplicationSortTime(a),
  );

  return (
    <div className="mt-3 divide-y divide-slate-100">
      {sortedApplications.map((application) => (
        <div key={application.id} className="py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-slate-950">
                {application.vehicle_name_snapshot}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {formatPeriod(application.start_at, application.end_at)}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${getVehicleApplicationStatusBadgeClass(
                application.status,
              )}`}
            >
              {VEHICLE_APPLICATION_STATUS_LABEL[application.status]}
            </span>
          </div>
          <div className="mt-2 grid gap-1 text-sm text-slate-600">
            {!compact && <p>사용목적: {application.purpose}</p>}
            <p>
              {application.departure_place} - {application.arrival_place}
            </p>
            {compact && (
              <p>
                {application.applicant_name} · {application.department}
              </p>
            )}
            {application.reject_reason && (
              <p className="text-red-600">
                반려사유: {application.reject_reason}
              </p>
            )}
            {application.returned_at && (
              <p className="text-slate-500">
                반납: {application.returned_by_name || "-"} ·{" "}
                {formatDateTime(application.returned_at)} ·{" "}
                {application.return_distance_km ?? "-"} km
              </p>
            )}
          </div>
          {onReturn && canReturnVehicle(application) && (
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onReturn(application)}
              >
                반납하기
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getApplicationSortTime(application: VehicleApplication) {
  return new Date(
    application.created_at || application.request_date || application.start_at,
  ).getTime();
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-semibold text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function VehicleTimeline({
  vehicles,
  applications,
  selectedDate,
  onCreateRange,
  onClickApplication,
}: {
  vehicles: CompanyVehicle[];
  applications: VehicleApplication[];
  selectedDate: string;
  onCreateRange: (vehicleId: string, startAt: string, endAt: string) => void;
  onClickApplication: (application: VehicleApplication) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState>({ mode: "idle" });
  const hours = useMemo(
    () =>
      Array.from(
        { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR },
        (_, index) => TIMELINE_START_HOUR + index,
      ),
    [],
  );
  const slots = useMemo(
    () => Array.from({ length: SLOT_COUNT }, (_, index) => index),
    [],
  );

  const getSlotFromX = useCallback((clientX: number) => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left - VEHICLE_LABEL_WIDTH;
    const slotWidth = (rect.width - VEHICLE_LABEL_WIDTH) / SLOT_COUNT;
    return clamp(Math.round(x / slotWidth), 0, SLOT_COUNT);
  }, []);

  const handleMouseDown = useCallback(
    (event: MouseEvent, vehicle: CompanyVehicle) => {
      if (event.button !== 0 || vehicle.status !== "available") return;
      const slot = getSlotFromX(event.clientX);
      setDrag({
        mode: "create",
        vehicleId: vehicle.id,
        startSlot: slot,
        endSlot: slot,
      });
    },
    [getSlotFromX],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (drag.mode !== "create") return;
      const slot = getSlotFromX(event.clientX);
      setDrag((prev) =>
        prev.mode === "create" ? { ...prev, endSlot: slot } : prev,
      );
    },
    [drag.mode, getSlotFromX],
  );

  const handleMouseUp = useCallback(() => {
    if (drag.mode === "create") {
      const startSlot = Math.min(drag.startSlot, drag.endSlot);
      const endSlot = Math.max(drag.startSlot, drag.endSlot);
      if (endSlot > startSlot) {
        if (
          getOverlappingTimelineApplication(
            applications,
            drag.vehicleId,
            selectedDate,
            startSlot,
            endSlot,
          )
        ) {
          toast.warning(
            "이미 등록된 차량 신청 시간과 겹칩니다. 겹치는 시간을 피해 신청해주세요.",
          );
          setDrag({ mode: "idle" });
          return;
        }
        onCreateRange(
          drag.vehicleId,
          slotToDateTime(selectedDate, startSlot),
          slotToDateTime(selectedDate, endSlot),
        );
      }
    }
    setDrag({ mode: "idle" });
  }, [applications, drag, onCreateRange, selectedDate]);

  return (
    <div
      ref={gridRef}
      className="select-none overflow-x-auto rounded-xl border border-slate-100 bg-white"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{ minWidth: 980 }}>
        <div
          className="flex border-b border-slate-100 bg-slate-50"
          style={{ height: HEADER_HEIGHT }}
        >
          <div
            className="shrink-0 border-r border-slate-100"
            style={{ width: VEHICLE_LABEL_WIDTH }}
          />
          <div className="relative flex-1">
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="absolute top-0 flex h-full items-center border-l border-slate-200 text-xs text-slate-500"
                style={{ left: `${((index * 2) / SLOT_COUNT) * 100}%` }}
              >
                <span className="pl-1">{String(hour).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>
        </div>

        {vehicles.map((vehicle) => {
          const rowApplications = applications.filter(
            (application) =>
              application.vehicle_id === vehicle.id &&
              application.status !== "cancelled",
          );
          const isDragTarget =
            drag.mode === "create" && drag.vehicleId === vehicle.id;

          return (
            <div
              key={vehicle.id}
              className="flex border-b border-slate-100 last:border-b-0"
              style={{ minHeight: ROW_HEIGHT }}
            >
              <div
                className="flex shrink-0 flex-col justify-center border-r border-slate-100 px-3"
                style={{ width: VEHICLE_LABEL_WIDTH }}
              >
                <p className="truncate text-sm font-semibold text-slate-950">
                  {formatVehicleName(vehicle)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {vehicle.vehicle_type} ·{" "}
                  {VEHICLE_STATUS_LABEL[vehicle.status]}
                </p>
              </div>

              <div
                className={`relative flex-1 ${
                  vehicle.status === "available"
                    ? "cursor-crosshair"
                    : "cursor-not-allowed bg-slate-50/60"
                }`}
                onMouseDown={(event) => handleMouseDown(event, vehicle)}
              >
                {slots.map((slot) => (
                  <div
                    key={slot}
                    className={`absolute bottom-0 top-0 ${
                      slot % 2 === 0
                        ? "border-l border-slate-200"
                        : "border-l border-slate-100"
                    }`}
                    style={{ left: `${(slot / SLOT_COUNT) * 100}%` }}
                  />
                ))}

                {isDragTarget && (
                  <TimelineSelectionBlock
                    startSlot={Math.min(drag.startSlot, drag.endSlot)}
                    endSlot={Math.max(drag.startSlot, drag.endSlot)}
                  />
                )}

                {rowApplications.map((application) => (
                  <VehicleApplicationBlock
                    key={application.id}
                    application={application}
                    selectedDate={selectedDate}
                    onClick={onClickApplication}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineSelectionBlock({
  startSlot,
  endSlot,
}: {
  startSlot: number;
  endSlot: number;
}) {
  if (endSlot <= startSlot) return null;
  return (
    <div
      className="absolute bottom-1 top-1 z-10 rounded-md border-2 border-dashed border-blue-400 bg-blue-100/60"
      style={{
        left: `${(startSlot / SLOT_COUNT) * 100}%`,
        width: `${((endSlot - startSlot) / SLOT_COUNT) * 100}%`,
      }}
    />
  );
}

function getOverlappingTimelineApplication(
  applications: VehicleApplication[],
  vehicleId: string,
  selectedDate: string,
  startSlot: number,
  endSlot: number,
) {
  return applications.find((application) => {
    if (application.vehicle_id !== vehicleId) return false;
    if (application.status !== "pending" && application.status !== "approved") {
      return false;
    }
    const applicationStartSlot = dateTimeToSlot(
      application.start_at,
      selectedDate,
    );
    const applicationEndSlot = dateTimeToSlot(application.end_at, selectedDate);
    return startSlot < applicationEndSlot && endSlot > applicationStartSlot;
  });
}

function VehicleApplicationBlock({
  application,
  selectedDate,
  onClick,
}: {
  application: VehicleApplication;
  selectedDate: string;
  onClick: (application: VehicleApplication) => void;
}) {
  const startSlot = dateTimeToSlot(application.start_at, selectedDate);
  const endSlot = dateTimeToSlot(application.end_at, selectedDate);
  const clampedStart = clamp(startSlot, 0, SLOT_COUNT);
  const clampedEnd = clamp(endSlot, 0, SLOT_COUNT);
  if (clampedEnd <= clampedStart) return null;

  const statusClass =
    application.status === "approved"
      ? "border-emerald-300 bg-emerald-50/55 text-emerald-900"
      : application.status === "rejected"
        ? "border-red-300 bg-red-50/55 text-red-800"
        : application.status === "cancelled"
          ? "border-slate-200 bg-slate-50/55 text-slate-500"
          : "border-amber-300 bg-amber-50/55 text-amber-900";

  return (
    <button
      type="button"
      className={`absolute bottom-1 top-1 z-20 overflow-hidden rounded-md border px-2 py-1 text-left text-xs backdrop-blur-[1px] transition hover:border-current/40 focus:outline-none focus:ring-2 focus:ring-slate-400/30 ${statusClass}`}
      style={{
        left: `${(clampedStart / SLOT_COUNT) * 100}%`,
        width: `${((clampedEnd - clampedStart) / SLOT_COUNT) * 100}%`,
      }}
      title={`${application.applicant_name} · ${application.purpose}`}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick(application);
      }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="min-w-0 truncate font-semibold">
          {application.applicant_name}
          {application.department ? (
            <span className="font-normal opacity-75">
              {" "}
              · {application.department}
            </span>
          ) : null}
        </p>
        <span className="shrink-0 rounded-full bg-white/75 px-1.5 py-0.5 text-[10px] font-semibold leading-none ring-1 ring-current/15">
          {VEHICLE_APPLICATION_STATUS_LABEL[application.status]}
        </span>
      </div>
      <p className="truncate">{application.purpose}</p>
    </button>
  );
}

function getVehicleApplicationStatusBadgeClass(
  status: VehicleApplication["status"],
) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    case "pending":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function slotToDateTime(date: string, slot: number) {
  return dayjs
    .tz(date, VEHICLE_TIMEZONE)
    .startOf("day")
    .add(TIMELINE_START_HOUR * 60 + slot * SLOT_MINUTES, "minute")
    .format("YYYY-MM-DDTHH:mm");
}

function dateTimeToSlot(value: string, date: string) {
  const diffMinutes = dayjs(value)
    .tz(VEHICLE_TIMEZONE)
    .diff(
      dayjs
        .tz(date, VEHICLE_TIMEZONE)
        .startOf("day")
        .add(TIMELINE_START_HOUR, "hour"),
      "minute",
    );
  return diffMinutes / SLOT_MINUTES;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createEmptyApplicationForm(
  defaultDepartment: string,
): ApplicationForm {
  return {
    department: defaultDepartment,
    purpose: "",
    passengers: "",
    startAt: dayjs().add(1, "hour").format("YYYY-MM-DDTHH:00"),
    endAt: dayjs().add(2, "hour").format("YYYY-MM-DDTHH:00"),
    vehicleId: "",
    departurePlace: "",
    arrivalPlace: "",
    sharedReferences: DEFAULT_VEHICLE_SHARED_REFERENCES,
    status: "pending",
  };
}

function applicationToForm(application: VehicleApplication): ApplicationForm {
  return {
    department: application.department,
    purpose: application.purpose,
    passengers: application.passengers ?? "",
    startAt: dateTimeToLocalInput(application.start_at),
    endAt: dateTimeToLocalInput(application.end_at),
    vehicleId: application.vehicle_id ?? "",
    departurePlace: application.departure_place,
    arrivalPlace: application.arrival_place,
    sharedReferences: application.shared_references ?? "",
    status: application.status,
  };
}

function getDefaultStartOdometer(
  data: VehicleUserState,
  application: VehicleApplication,
) {
  const previousApplications = [...data.myApplications, ...data.allApplications]
    .filter(
      (item) =>
        item.id !== application.id &&
        item.vehicle_id === application.vehicle_id &&
        item.return_end_odometer_km !== null &&
        new Date(item.end_at).getTime() <=
          new Date(application.start_at).getTime(),
    )
    .sort(
      (a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime(),
    );
  const vehicle = data.vehicles.find(
    (item) => item.id === application.vehicle_id,
  );

  return (
    previousApplications[0]?.return_end_odometer_km ??
    vehicle?.odometer_km ??
    null
  );
}

function formatOdometerInput(value: number | null) {
  if (value === null || value === undefined) return "";
  return Number(value).toString();
}

function getDistanceKm(startValue: string, endValue: string) {
  const start = Number(startValue);
  const end = Number(endValue);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (end < start) return null;
  return Number((end - start).toFixed(1));
}

function dateTimeLocalToIso(value: string) {
  if (!value) return "";
  return dayjs(`${value}:00+09:00`).toISOString();
}

function dateTimeToLocalInput(value: string) {
  return dayjs(value).tz(VEHICLE_TIMEZONE).format("YYYY-MM-DDTHH:mm");
}

function canReturnVehicle(application: VehicleApplication) {
  return application.status === "approved" && !application.returned_at;
}

function getDatePart(value: string) {
  return value.split("T")[0] || dayjs().format("YYYY-MM-DD");
}

function getTimePart(value: string) {
  return value.split("T")[1]?.slice(0, 5) || "09:00";
}

function combineDateTime(date: string, time: string) {
  return `${date || dayjs().format("YYYY-MM-DD")}T${time || "09:00"}`;
}

function formatPeriod(startAt: string, endAt: string) {
  return `${dayjs(startAt).format("YYYY-MM-DD HH:mm")} ~ ${dayjs(endAt).format("YYYY-MM-DD HH:mm")}`;
}

function formatDateTime(value: string) {
  return dayjs(value).tz(VEHICLE_TIMEZONE).format("YYYY-MM-DD HH:mm");
}
