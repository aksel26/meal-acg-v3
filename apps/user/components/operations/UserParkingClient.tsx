"use client";

import { useCallback, useEffect, useState } from "react";
import { DatePicker } from "@repo/ui/src/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { toast } from "@repo/ui/src/sonner";
import {
  OperationConfirmDialog,
  OperationEmpty,
  OperationFormDialog,
  OperationLoading,
  OperationPagination,
  OperationsPage,
  OperationStatus,
  operationButtonClass,
  operationDangerButtonClass,
  operationInputClass,
  operationSecondaryButtonClass,
  operationTextareaClass,
} from "@repo/ui/src/operations";
import { operationRequest, today } from "./client";
import {
  PARKING_TICKET_OPTIONS,
  PARKING_USAGE_TYPE_LABELS,
  parkingTotalFee,
  type ParkingTicketCode,
  type ParkingUsageType,
} from "utils/company-operations";

type ParkingRegistration = {
  id: string;
  vehicle_plate: string;
  vehicle_name: string;
  vehicle_type: string;
  requested_start_date: string;
  ticket_code: ParkingTicketCode;
  extra_ticket_codes: ParkingTicketCode[] | null;
  usage_type: ParkingUsageType;
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
const feeLabel = (fee: number) =>
  fee === 0 ? "무료" : `${fee.toLocaleString("ko-KR")}원`;
const ticketLabel = (code: ParkingTicketCode) => {
  const ticket = PARKING_TICKET_OPTIONS.find((item) => item.code === code);
  return ticket ? `${ticket.label} · ${feeLabel(ticket.fee)}` : code;
};

export function UserParkingClient() {
  const [items, setItems] = useState<ParkingRegistration[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [parkingDate, setParkingDate] = useState(today());
  const [ticketCode, setTicketCode] = useState<ParkingTicketCode>("two_hours");
  const [usageType, setUsageType] = useState<ParkingUsageType>("business");
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
    setParkingDate(today());
    setTicketCode("two_hours");
    setUsageType("business");
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
          requestedDate: parkingDate,
          ticketCode,
          usageType,
          note,
        }),
      });
      toast.success(
        editingId ? "주차 등록을 수정했습니다." : "주차 등록을 신청했습니다.",
      );
      setFormOpen(false);
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
      <OperationFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) reset();
        }}
        title={editingId ? "주차 등록 수정" : "주차 등록 신청"}
        description="차량 정보와 주차 일자, 사용할 시간권을 입력해주세요."
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {[
            {
              label: "차량번호",
              name: "vehiclePlate",
              value: vehiclePlate,
              setter: setVehiclePlate,
              placeholder: "예: 12가 3456…",
            },
            {
              label: "차량명",
              name: "vehicleName",
              value: vehicleName,
              setter: setVehicleName,
              placeholder: "예: 아이오닉 5…",
            },
            {
              label: "차종",
              name: "vehicleType",
              value: vehicleType,
              setter: setVehicleType,
              placeholder: "예: 승용차…",
            },
          ].map(({ label, name, value, setter, placeholder }) => (
            <label key={name} className="text-sm text-slate-600">
              {label}
              <input
                name={name}
                autoComplete="off"
                required
                value={value}
                placeholder={placeholder}
                onChange={(event) => setter(event.target.value)}
                className={`mt-1 ${operationInputClass}`}
              />
            </label>
          ))}
          <label className="text-sm text-slate-600">
            주차 일자
            <DatePicker
              modal
              value={parkingDate}
              ariaLabel="주차 일자"
              placeholder="주차 일자 선택…"
              className="mt-1 h-10"
              onChange={setParkingDate}
            />
          </label>
          <label className="text-sm text-slate-600">
            주차 시간권
            <Select
              value={ticketCode}
              onValueChange={(value) =>
                setTicketCode(value as ParkingTicketCode)
              }
            >
              <SelectTrigger
                aria-label="주차 시간권"
                className="mt-1 w-full data-[size=default]:h-10"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARKING_TICKET_OPTIONS.map((ticket) => (
                  <SelectItem key={ticket.code} value={ticket.code}>
                    {ticket.label} · {feeLabel(ticket.fee)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-sm text-slate-600">
            주차 구분
            <Select
              value={usageType}
              onValueChange={(value) => setUsageType(value as ParkingUsageType)}
            >
              <SelectTrigger
                aria-label="주차 구분"
                className="mt-1 w-full data-[size=default]:h-10"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PARKING_USAGE_TYPE_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <span className="mt-1 block text-xs text-slate-500">
              {usageType === "business"
                ? "업무 관련 주차비는 회사에서 제공합니다."
                : "개인 주차는 P&C팀 문의 후 공지된 계좌로 입금합니다."}
            </span>
          </label>
          <label className="text-sm text-slate-600 sm:col-span-2">
            메모
            <textarea
              name="note"
              autoComplete="off"
              value={note}
              placeholder="전달할 내용을 입력해주세요…"
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={busy || !parkingDate}
              className={operationButtonClass}
            >
              {busy ? "저장 중…" : editingId ? "수정 저장" : "신청"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  reset();
                }}
                className={operationSecondaryButtonClass}
              >
                수정 취소
              </button>
            )}
          </div>
        </form>
      </OperationFormDialog>

      <section className="rounded-2xl bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-950">
            등록 이력{" "}
            {!loading && (
              <span className="font-medium text-slate-400">
                · {items.length}건
              </span>
            )}
          </h2>
          {items.length > 0 && (
            <button
              type="button"
              className={operationButtonClass}
              onClick={() => {
                reset();
                setFormOpen(true);
              }}
            >
              등록 추가
            </button>
          )}
        </div>
        {loading ? (
          <OperationLoading label="주차 등록 이력을 불러오는 중…" />
        ) : items.length === 0 ? (
          <OperationEmpty
            action={
              <button
                type="button"
                className={operationButtonClass}
                onClick={() => {
                  reset();
                  setFormOpen(true);
                }}
              >
                주차 등록 신청
              </button>
            }
          >
            주차 등록 이력이 없습니다.
          </OperationEmpty>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-slate-950">
                    {item.vehicle_plate} · {item.vehicle_name}
                  </p>
                  <p className="mt-1 break-words text-sm text-slate-500">
                    {item.vehicle_type} · {item.requested_start_date} ·{" "}
                    {ticketLabel(item.ticket_code)} ·{" "}
                    {PARKING_USAGE_TYPE_LABELS[item.usage_type]}
                  </p>
                  {(item.extra_ticket_codes?.length ?? 0) > 0 && (
                    <p className="mt-0.5 text-sm text-slate-500">
                      추가{" "}
                      {item.extra_ticket_codes
                        ?.map((code) => ticketLabel(code))
                        .join(", ")}{" "}
                      · 합계{" "}
                      {feeLabel(
                        parkingTotalFee(
                          item.ticket_code,
                          item.extra_ticket_codes ?? [],
                        ),
                      )}
                    </p>
                  )}
                  {(item.rejection_reason || item.admin_note) && (
                    <p className="mt-1 break-words text-sm text-rose-600">
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
                          setParkingDate(item.requested_start_date);
                          setTicketCode(item.ticket_code);
                          setUsageType(item.usage_type);
                          setNote(item.note ?? "");
                          setFormOpen(true);
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
        <OperationPagination
          page={page}
          hasMore={hasMore}
          disabled={loading || busy}
          onPageChange={setPage}
        />
      </section>
    </OperationsPage>
  );
}
