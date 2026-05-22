"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { MoveRight, X } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
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
  LockerRequestSummary,
  LockerRequestType,
  LockerSummary,
  MyLockerState,
} from "@/lib/facilities";

const REQUEST_TYPE_LABEL: Record<LockerRequestType, string> = {
  assign: "배정 요청",
  move: "이동 요청",
  release: "배정 해제",
};

const REQUEST_STATUS_LABEL: Record<LockerRequestSummary["status"], string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
};

export function UserLockerClient({
  initialData,
}: {
  initialData: MyLockerState;
}) {
  const [data, setData] = useState(initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<LockerRequestType>(
    data.myAssignment ? "move" : "assign",
  );
  const [preferredLockerId, setPreferredLockerId] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lockerGrid = useMemo(
    () => buildLockerGridCells(data.lockers),
    [data.lockers],
  );
  const pendingLockerId = data.myPendingRequest?.preferred_locker_id ?? null;

  async function refresh() {
    const response = await fetch(`/api/lockers?ts=${Date.now()}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "사물함 정보를 불러오지 못했습니다.");
    }
    setData(payload);
  }

  async function submitRequest() {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lockers/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          preferredLockerId: preferredLockerId || null,
          reason,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "사물함 요청 등록 실패");
      }
      toast.success("사물함 요청을 등록했습니다.");
      setDialogOpen(false);
      setReason("");
      setPreferredLockerId("");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "사물함 요청 등록 실패",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancelRequest(requestId: string) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lockers/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "사물함 요청 취소 실패");
      }
      toast.success("사물함 요청을 취소했습니다.");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "사물함 요청 취소 실패",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openRequestDialog(lockerId: string) {
    if (data.myPendingRequest) return;
    setPreferredLockerId(lockerId);
    setRequestType(data.myAssignment ? "move" : "assign");
    setDialogOpen(true);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(280px,1fr)]">
      <section className="rounded-2xl bg-white p-4">
        <div>
          <div className="grid max-w-[360px] grid-cols-6 gap-1.5 sm:max-w-[420px]">
            {lockerGrid.map((cell) =>
              cell.locker ? (
                <LockerGridCell
                  key={cell.key}
                  locker={cell.locker}
                  hasPendingRequest={Boolean(data.myPendingRequest)}
                  isPendingRequested={cell.locker.id === pendingLockerId}
                  onSelect={() => openRequestDialog(cell.locker!.id)}
                />
              ) : (
                <div
                  key={cell.key}
                  className="relative aspect-square rounded-md border border-dashed border-slate-200 bg-white"
                >
                  <span className="absolute left-1.5 top-1.5 text-[11px] leading-none text-slate-100 md:text-xs">
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
              className="bg-emerald-50 ring-2 ring-emerald-300"
              label="내 사물함"
            />
            <LegendDot
              className="bg-amber-50 ring-1 ring-amber-200"
              label="요청 대기"
            />
            <LegendDot
              className="bg-slate-100 ring-1 ring-slate-200"
              label="사용중지"
            />
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl bg-white p-4">
          <p className="text-sm text-slate-500">현재 배정</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {data.myAssignment
              ? `${data.myAssignment.code} · ${data.myAssignment.location_detail}`
              : "배정된 사물함 없음"}
          </p>
          {data.myPendingRequest && (
            <p className="mt-2 text-sm text-amber-600">
              사물함 요청이 처리 대기 중입니다.
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">나의 신청 이력</h2>
            <span className="text-xs text-slate-400">
              {data.myRequests.length}건
            </span>
          </div>
          {data.myRequests.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              배정 이력이 없습니다.
            </p>
          ) : (
            <div
              className={
                data.myRequests.length >= 2
                  ? "mt-3 divide-y divide-slate-200"
                  : "mt-3"
              }
            >
              {data.myRequests.map((request) => (
                <RequestHistoryItem
                  key={request.id}
                  request={request}
                  isSubmitting={isSubmitting}
                  onCancel={() => cancelRequest(request.id)}
                />
              ))}
            </div>
          )}
        </section>
      </aside>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {requestType === "move" ? "사물함 이동 요청" : "사물함 배정 요청"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={requestType}
              onValueChange={(value) =>
                setRequestType(value as LockerRequestType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assign">배정 요청</SelectItem>
                <SelectItem value="move">이동 요청</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={preferredLockerId || "none"}
              onValueChange={(value) =>
                setPreferredLockerId(value === "none" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="희망 사물함 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">희망 사물함 없음</SelectItem>
                {data.lockers.map((locker) => (
                  <SelectItem key={locker.id} value={locker.id}>
                    {locker.code} · {locker.location_detail}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                requestType === "move" ? "이동 요청 사유" : "배정 요청 사유"
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={submitRequest}
              disabled={isSubmitting || !reason.trim()}
            >
              <MoveRight className="mr-2 h-4 w-4" />
              요청 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LockerGridCell({
  locker,
  hasPendingRequest,
  isPendingRequested,
  onSelect,
}: {
  locker: LockerSummary;
  hasPendingRequest: boolean;
  isPendingRequested: boolean;
  onSelect: () => void;
}) {
  const isAssigned = Boolean(locker.assigned_member_name);
  const isSelectable =
    !hasPendingRequest && locker.status !== "disabled" && !isAssigned;
  const label =
    locker.status === "disabled"
      ? "사용중지"
      : locker.assigned_member_name || (isPendingRequested ? "대기" : "빈칸");

  const className = locker.is_assigned_to_me
    ? "border-emerald-300 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200"
    : isAssigned
      ? "border-slate-300 bg-slate-200 text-slate-600"
      : isPendingRequested
        ? "border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        : locker.status === "disabled"
          ? "border-slate-200 bg-slate-100 text-slate-400"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={isSelectable ? onSelect : undefined}
      disabled={!isSelectable}
      className={`relative aspect-square min-w-0 rounded-md border p-1.5 text-left transition ${className}`}
      title={`${locker.code} · ${locker.location_detail}`}
    >
      <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-12px)] truncate text-[11px] font-semibold leading-none md:text-xs">
        {locker.code}
      </span>
      <span className="flex h-full items-center justify-center px-1 text-center text-[10px] font-semibold leading-tight md:text-xs">
        <span
          className={`line-clamp-2 break-keep ${
            label === "빈칸" ? "text-slate-300" : ""
          }`}
        >
          {label}
        </span>
      </span>
    </button>
  );
}

function RequestHistoryItem({
  request,
  isSubmitting,
  onCancel,
}: {
  request: LockerRequestSummary;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const targetLocker = request.preferred_locker
    ? `${request.preferred_locker.code} · ${request.preferred_locker.location_detail}`
    : request.current_locker
      ? `${request.current_locker.code} · ${request.current_locker.location_detail}`
      : "희망 사물함 없음";

  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">
            {REQUEST_TYPE_LABEL[request.request_type]}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {dayjs(request.created_at).format("YYYY.MM.DD HH:mm")} ·{" "}
            {targetLocker}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getRequestStatusClass(
            request.status,
          )}`}
        >
          {REQUEST_STATUS_LABEL[request.status]}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
        {request.reason}
      </p>
      {request.reject_reason && (
        <p className="mt-1 text-xs text-red-600">
          반려 사유: {request.reject_reason}
        </p>
      )}
      {request.status === "pending" && (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <X className="mr-1 h-4 w-4" />
            요청 취소
          </Button>
        </div>
      )}
    </div>
  );
}

function getRequestStatusClass(status: LockerRequestSummary["status"]) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700";
    case "rejected":
      return "bg-red-50 text-red-700";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    case "pending":
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function buildLockerGridCells(lockers: LockerSummary[]) {
  const lockerBySlot = new Map<number, LockerSummary>();
  const overflowLockers: LockerSummary[] = [];

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
