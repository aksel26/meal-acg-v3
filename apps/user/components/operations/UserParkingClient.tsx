"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@repo/ui/src/sonner";
import {
  OperationConfirmDialog,
  OperationEmpty,
  OperationLoading,
  OperationPagination,
  OperationsPage,
  OperationsSection,
  OperationStatus,
  operationButtonClass,
  operationDangerButtonClass,
  operationInputClass,
  operationSecondaryButtonClass,
  operationTextareaClass,
} from "@repo/ui/src/operations";
import { operationRequest, today } from "./client";

type ParkingRegistration = {
  id: string;
  vehicle_plate: string;
  vehicle_name: string;
  vehicle_type: string;
  requested_start_date: string;
  requested_end_date: string | null;
  note: string | null;
  status: string;
  rejection_reason: string | null;
  admin_note: string | null;
};
const labels: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  expired: "만료",
  cancelled: "취소",
  archived: "보관",
};

export function UserParkingClient() {
  const [items, setItems] = useState<ParkingRegistration[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await operationRequest<{
        registrations: ParkingRegistration[];
        pagination: { hasMore: boolean };
      }>(`/api/parking?page=${page}`);
      setItems(data.registrations);
      setHasMore(data.pagination.hasMore);
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, [load]);

  function reset() {
    setEditingId(null);
    setVehiclePlate("");
    setVehicleName("");
    setVehicleType("");
    setStartDate(today());
    setEndDate("");
    setNote("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await operationRequest("/api/parking", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          action: editingId ? "update" : undefined,
          vehiclePlate,
          vehicleName,
          vehicleType,
          requestedStartDate: startDate,
          requestedEndDate: endDate,
          note,
        }),
      });
      toast.success(
        editingId ? "주차 등록을 수정했습니다." : "주차 등록을 신청했습니다.",
      );
      reset();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      await operationRequest("/api/parking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "cancel" }),
      });
      toast.success("주차 등록을 취소했습니다.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "취소에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationsPage
      title="주차"
      description="개인 차량의 사내 주차 등록을 신청하고 처리 상태를 확인합니다."
    >
      <OperationsSection title={editingId ? "등록 수정" : "주차 등록 신청"}>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
          {[
            ["차량번호", vehiclePlate, setVehiclePlate],
            ["차량명", vehicleName, setVehicleName],
            ["차종", vehicleType, setVehicleType],
          ].map(([label, value, setter]) => (
            <label key={label as string} className="text-sm text-slate-600">
              {label as string}
              <input
                required
                value={value as string}
                onChange={(event) =>
                  (setter as React.Dispatch<React.SetStateAction<string>>)(
                    event.target.value,
                  )
                }
                className={`mt-1 ${operationInputClass}`}
              />
            </label>
          ))}
          <label className="text-sm text-slate-600">
            시작일
            <input
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            종료일
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-3">
            메모
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
            />
          </label>
          <div className="flex gap-2 md:col-span-3">
            <button disabled={busy} className={operationButtonClass}>
              {editingId ? "수정 저장" : "신청"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                className={operationSecondaryButtonClass}
              >
                수정 취소
              </button>
            )}
          </div>
        </form>
      </OperationsSection>

      <OperationsSection title="등록 이력">
        {loading ? (
          <OperationLoading label="주차 등록 이력을 불러오는 중" />
        ) : items.length === 0 ? (
          <OperationEmpty>주차 등록 이력이 없습니다.</OperationEmpty>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-950">
                    {item.vehicle_plate} · {item.vehicle_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.vehicle_type} · {item.requested_start_date}
                    {item.requested_end_date && ` ~ ${item.requested_end_date}`}
                  </p>
                  {(item.rejection_reason || item.admin_note) && (
                    <p className="mt-1 text-sm text-rose-600">
                      {item.rejection_reason || item.admin_note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <OperationStatus value={item.status} labels={labels} />
                  {item.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className={operationSecondaryButtonClass}
                        onClick={() => {
                          setEditingId(item.id);
                          setVehiclePlate(item.vehicle_plate);
                          setVehicleName(item.vehicle_name);
                          setVehicleType(item.vehicle_type);
                          setStartDate(item.requested_start_date);
                          setEndDate(item.requested_end_date ?? "");
                          setNote(item.note ?? "");
                        }}
                      >
                        수정
                      </button>
                      <OperationConfirmDialog
                        title="주차 등록을 취소할까요?"
                        description="취소한 등록은 관리자 처리 대상에서 제외됩니다."
                        confirmLabel="등록 취소"
                        onConfirm={() => cancel(item.id)}
                      >
                        <button
                          type="button"
                          disabled={busy}
                          className={operationDangerButtonClass}
                        >
                          취소
                        </button>
                      </OperationConfirmDialog>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </OperationsSection>
      <OperationPagination
        page={page}
        hasMore={hasMore}
        disabled={loading || busy}
        onPageChange={setPage}
      />
    </OperationsPage>
  );
}
