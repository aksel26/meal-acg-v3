"use client";

import {
  forwardRef,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import dayjs from "dayjs";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { toast } from "@repo/ui/src/sonner";
import { Textarea } from "@repo/ui/src/textarea";
import {
  getActiveAssignment,
  getAssignmentMember,
  getTeamName,
  type AdminLocker,
  type AdminLockerMember,
  type AdminLockerRequest,
  type LockerAdminOverview,
} from "@/lib/facilities-types";
import { useLockers, useLockerMutations } from "@/hooks/useLockers";

const STATUS_LABEL: Record<string, string> = {
  available: "사용 가능",
  assigned: "배정됨",
  disabled: "사용 중지",
  assign: "배정 요청",
  move: "이동 요청",
  release: "배정 해제",
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
};

export function AdminLockerClient({
  initialData,
}: {
  initialData: LockerAdminOverview;
}) {
  const { data } = useLockers(initialData);
  const { createLocker, processRequest, assignLocker, releaseLocker } =
    useLockerMutations();
  const [selectedLockerId, setSelectedLockerId] = useState("");
  const [lockerDialogOpen, setLockerDialogOpen] = useState(false);
  const [lockerForm, setLockerForm] = useState(() => createEmptyLockerForm());
  const [assignmentMemberId, setAssignmentMemberId] = useState("");
  const [rejectingRequest, setRejectingRequest] =
    useState<AdminLockerRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const lockerGrid = useMemo(
    () => buildLockerGridCells(data.lockers),
    [data.lockers],
  );
  const pendingRequestByLockerId = useMemo(() => {
    const pendingRequests = new Map<string, AdminLockerRequest>();
    for (const request of data.requests) {
      if (
        request.status === "pending" &&
        request.preferred_locker_id &&
        !pendingRequests.has(request.preferred_locker_id)
      ) {
        pendingRequests.set(request.preferred_locker_id, request);
      }
    }
    return pendingRequests;
  }, [data.requests]);
  const assignedLockerCount = data.lockers.filter((locker) =>
    getActiveAssignment(locker),
  ).length;
  const selectedLocker =
    data.lockers.find((locker) => locker.id === selectedLockerId) ?? null;

  const isSubmitting =
    createLocker.isPending ||
    processRequest.isPending ||
    assignLocker.isPending ||
    releaseLocker.isPending;

  async function submitLockerForm() {
    try {
      await createLocker.mutateAsync(lockerForm);
      toast.success("사물함을 추가했습니다.");
      setLockerDialogOpen(false);
      setLockerForm(createEmptyLockerForm());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "사물함 저장 실패");
    }
  }

  async function approveRequest(request: AdminLockerRequest) {
    await handleProcessRequest(request, {
      status: "approved",
      lockerId: request.preferred_locker_id,
    });
  }

  async function rejectRequest() {
    if (!rejectingRequest) return;
    await handleProcessRequest(rejectingRequest, {
      status: "rejected",
      rejectReason,
    });
    setRejectingRequest(null);
    setRejectReason("");
  }

  async function handleProcessRequest(
    request: AdminLockerRequest,
    payload: {
      status: "approved" | "rejected";
      lockerId?: string | null;
      rejectReason?: string;
    },
  ) {
    try {
      await processRequest.mutateAsync({ id: request.id, payload });
      toast.success(
        payload.status === "approved"
          ? "사물함 요청을 승인했습니다."
          : "사물함 요청을 반려했습니다.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "사물함 요청 처리 실패",
      );
    }
  }

  async function assignSelectedLocker(memberId: string) {
    if (!selectedLocker || !memberId) return;
    try {
      await assignLocker.mutateAsync({ lockerId: selectedLocker.id, memberId });
      toast.success("사물함을 배정했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "사물함 배정 실패");
    }
  }

  async function releaseSelectedLocker() {
    if (!selectedLocker) return;
    try {
      await releaseLocker.mutateAsync(selectedLocker.id);
      toast.success("사물함 배정을 해제했습니다.");
      setAssignmentMemberId("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "사물함 배정 해제 실패",
      );
    }
  }

  function openCreateLocker() {
    setLockerForm(createEmptyLockerForm());
    setLockerDialogOpen(true);
  }

  function selectLocker(locker: AdminLocker) {
    const activeAssignment = getActiveAssignment(locker);
    const member = getAssignmentMember(activeAssignment);
    setSelectedLockerId(locker.id);
    setAssignmentMemberId(member?.id ?? "");
  }

  function closeLockerPopover(lockerId: string) {
    if (selectedLockerId === lockerId) {
      setSelectedLockerId("");
      setAssignmentMemberId("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(320px,1fr)]">
        <div className="rounded-xl bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              전체 사물함 현황{" "}
              <span className="text-sm font-medium text-slate-500">
                ({data.lockers.length}개 / {assignedLockerCount}개)
              </span>
            </h2>
            <Button onClick={openCreateLocker}>
              <Plus className="mr-2 h-4 w-4" />
              사물함 추가
            </Button>
          </div>
          <div className="grid max-w-[360px] grid-cols-6 gap-1.5 sm:max-w-[420px]">
            {lockerGrid.map((cell) =>
              cell.locker ? (
                <Popover
                  key={cell.key}
                  open={cell.locker.id === selectedLockerId}
                  onOpenChange={(open) =>
                    open
                      ? selectLocker(cell.locker!)
                      : closeLockerPopover(cell.locker!.id)
                  }
                >
                  <PopoverTrigger asChild>
                    <AdminLockerGridCell
                      locker={cell.locker}
                      pendingRequest={pendingRequestByLockerId.get(
                        cell.locker.id,
                      )}
                      isSelected={cell.locker.id === selectedLocker?.id}
                    />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 p-4">
                    <GridAssignmentDropdown
                      locker={cell.locker}
                      members={data.members}
                      assignmentMemberId={assignmentMemberId}
                      isSubmitting={isSubmitting}
                      onAssignmentMemberChange={setAssignmentMemberId}
                      onAssign={assignSelectedLocker}
                      onRelease={releaseSelectedLocker}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div
                  key={cell.key}
                  className="relative aspect-square rounded-md border border-dashed border-slate-200 bg-white"
                >
                  <span className="absolute left-1.5 top-1.5 text-[11px] font-semibold leading-none text-slate-400 md:text-xs">
                    {cell.slot}
                  </span>
                </div>
              ),
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <LegendDot
              className="bg-white ring-1 ring-slate-200"
              label="빈칸"
            />
            <LegendDot className="bg-slate-200" label="배정됨" />
            <LegendDot
              className="bg-amber-50 ring-1 ring-amber-200"
              label="요청 대기"
            />
            <LegendDot
              className="bg-red-50 ring-1 ring-red-200"
              label="사용 중지"
            />
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">배정 내역</h2>
              <span className="text-xs text-slate-400">
                {data.requests.length}건
              </span>
            </div>
            {data.requests.length === 0 ? (
              <EmptyState text="배정 내역이 없습니다." />
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {data.requests.map((request) => (
                  <AdminRequestItem
                    key={request.id}
                    request={request}
                    isSubmitting={isSubmitting}
                    onApprove={() => approveRequest(request)}
                    onReject={() => {
                      setRejectingRequest(request);
                      setRejectReason("");
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>

      <Dialog open={lockerDialogOpen} onOpenChange={setLockerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사물함 추가</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={lockerForm.code}
              onChange={(event) =>
                setLockerForm((prev) => ({ ...prev, code: event.target.value }))
              }
              placeholder="사물함 번호"
            />
            <Input
              value={lockerForm.locationZone}
              onChange={(event) =>
                setLockerForm((prev) => ({
                  ...prev,
                  locationZone: event.target.value,
                }))
              }
              placeholder="구역"
            />
            <Input
              value={lockerForm.locationDetail}
              onChange={(event) =>
                setLockerForm((prev) => ({
                  ...prev,
                  locationDetail: event.target.value,
                }))
              }
              placeholder="상세 위치"
            />
            <Input
              value={lockerForm.floor}
              onChange={(event) =>
                setLockerForm((prev) => ({
                  ...prev,
                  floor: event.target.value,
                }))
              }
              placeholder="층"
            />
            <Input
              value={lockerForm.rowLabel}
              onChange={(event) =>
                setLockerForm((prev) => ({
                  ...prev,
                  rowLabel: event.target.value,
                }))
              }
              placeholder="행"
            />
            <Input
              value={lockerForm.columnLabel}
              onChange={(event) =>
                setLockerForm((prev) => ({
                  ...prev,
                  columnLabel: event.target.value,
                }))
              }
              placeholder="열"
            />
            <Input
              value={lockerForm.memo}
              onChange={(event) =>
                setLockerForm((prev) => ({ ...prev, memo: event.target.value }))
              }
              placeholder="메모"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLockerDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={submitLockerForm}
              disabled={
                isSubmitting ||
                !lockerForm.code.trim() ||
                !lockerForm.locationZone.trim() ||
                !lockerForm.locationDetail.trim()
              }
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectingRequest)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingRequest(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사물함 요청 반려</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="반려 사유"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectingRequest(null);
                setRejectReason("");
              }}
            >
              취소
            </Button>
            <Button
              onClick={rejectRequest}
              disabled={isSubmitting || !rejectReason.trim()}
            >
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GridAssignmentDropdown({
  locker,
  members,
  assignmentMemberId,
  isSubmitting,
  onAssignmentMemberChange,
  onAssign,
  onRelease,
}: {
  locker: AdminLocker;
  members: AdminLockerMember[];
  assignmentMemberId: string;
  isSubmitting: boolean;
  onAssignmentMemberChange: (memberId: string) => void;
  onAssign: (memberId: string) => void;
  onRelease: () => void;
}) {
  const activeAssignment = getActiveAssignment(locker);
  const member = getAssignmentMember(activeAssignment);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">
          {locker.code} 배정
        </p>
        {member && (
          <p className="truncate text-xs text-slate-500">
            현재: {member.full_name || "이름 없음"}
          </p>
        )}
      </div>
      <div className="space-y-3">
        <Select
          value={assignmentMemberId || "none"}
          onValueChange={(value) => {
            const memberId = value === "none" ? "" : value;
            onAssignmentMemberChange(memberId);
            if (memberId && memberId !== member?.id) {
              onAssign(memberId);
            }
          }}
          disabled={locker.status === "disabled" || isSubmitting}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="배정할 직원 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">직원 선택</SelectItem>
            {members.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.full_name || "이름 없음"}
                {getTeamName(item.team) ? ` · ${getTeamName(item.team)}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {member && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRelease}
              disabled={isSubmitting}
            >
              배정 해제
            </Button>
          </div>
        )}
        {locker?.status === "disabled" && (
          <p className="text-xs text-red-600">
            사용 중지된 사물함은 직원을 배정할 수 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

const AdminLockerGridCell = forwardRef<
  HTMLButtonElement,
  {
    locker: AdminLocker;
    pendingRequest?: AdminLockerRequest;
    isSelected: boolean;
  } & ComponentPropsWithoutRef<"button">
>(function AdminLockerGridCell(
  { locker, pendingRequest, isSelected, className: triggerClassName, ...props },
  ref,
) {
  const activeAssignment = getActiveAssignment(locker);
  const member = getAssignmentMember(activeAssignment);
  const isAssigned = Boolean(member?.full_name);
  const label =
    locker.status === "disabled"
      ? "사용중지"
      : member?.full_name || (pendingRequest ? "대기" : "빈칸");
  const className = isSelected
    ? "border-sky-400 bg-sky-50 text-sky-950 ring-2 ring-sky-200"
    : locker.status === "disabled"
      ? "border-red-200 bg-red-50 text-red-700"
      : isAssigned
        ? "border-slate-300 bg-slate-200 text-slate-700"
        : pendingRequest
          ? "border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-200"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50";

  return (
    <button
      ref={ref}
      type="button"
      className={`relative aspect-square min-w-0 rounded-md border p-1.5 text-left transition ${className} ${triggerClassName ?? ""}`}
      title={`${locker.code} · ${locker.location_detail}`}
      {...props}
    >
      <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-12px)] truncate text-[11px] font-semibold leading-none md:text-xs">
        {locker.code}
      </span>
      <span className="flex h-full items-center justify-center px-1 text-center text-[10px] font-semibold leading-tight md:text-xs">
        <span
          className={`line-clamp-2 break-keep ${
            label === "빈칸" ? "text-slate-400" : ""
          }`}
        >
          {label}
        </span>
      </span>
    </button>
  );
});

function AdminRequestItem({
  request,
  isSubmitting,
  onApprove,
  onReject,
}: {
  request: AdminLockerRequest;
  isSubmitting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const requesterTeam = getTeamName(request.requester?.team);
  const targetLocker = request.preferred_locker
    ? `${request.preferred_locker.code}번 · ${request.preferred_locker.location_detail}`
    : request.current_locker
      ? `${request.current_locker.code}번 · ${request.current_locker.location_detail}`
      : "희망 사물함 없음";
  const currentLocker = request.current_locker
    ? `${request.current_locker.code}번 · ${request.current_locker.location_detail}`
    : null;

  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-950">
            {request.requester?.full_name || "이름 없음"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {requesterTeam || "소속 없음"} ·{" "}
            {dayjs(request.created_at).format("YYYY.MM.DD HH:mm")}
          </p>
        </div>
        <StatusBadge value={request.status} />
      </div>
      <div className="mt-2 text-sm text-slate-600">
        <p>
          {STATUS_LABEL[request.request_type] || request.request_type}:{" "}
          {currentLocker ? `${currentLocker} -> ${targetLocker}` : targetLocker}
        </p>
        <p className="mt-1 line-clamp-2">{request.reason}</p>
        {request.reject_reason && (
          <p className="mt-1 text-xs text-red-600">
            반려 사유: {request.reject_reason}
          </p>
        )}
      </div>
      {request.status === "pending" && (
        <div className="mt-3 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={isSubmitting}
          >
            <X className="mr-1 h-4 w-4" />
            반려
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onApprove}
            disabled={isSubmitting || !request.preferred_locker_id}
          >
            <Check className="mr-1 h-4 w-4" />
            승인
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const className =
    value === "approved" || value === "assigned"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "cancelled"
        ? "border-slate-200 bg-slate-100 text-slate-500"
        : value === "pending" || value === "available" || value === "assign"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {STATUS_LABEL[value] || value}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-16 text-center text-sm text-slate-500">{text}</div>;
}

function createEmptyLockerForm() {
  return {
    code: "",
    locationZone: "",
    locationDetail: "",
    floor: "",
    rowLabel: "",
    columnLabel: "",
    status: "available",
    memo: "",
  };
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function buildLockerGridCells(lockers: AdminLocker[]) {
  const lockerBySlot = new Map<number, AdminLocker>();
  const overflowLockers: AdminLocker[] = [];

  for (const locker of lockers) {
    const slot = Number(locker.code);
    if (Number.isInteger(slot) && slot >= 1 && slot <= 36) {
      lockerBySlot.set(slot, locker);
    } else {
      overflowLockers.push(locker);
    }
  }

  return Array.from({ length: 36 }, (_, index) => {
    const slot = index + 1;
    const locker = lockerBySlot.get(slot) ?? overflowLockers[index] ?? null;
    return {
      key: locker?.id ?? `empty-${slot}`,
      locker,
      slot,
    };
  });
}
