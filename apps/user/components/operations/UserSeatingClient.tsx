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

type Seat = {
  id: string;
  code: string;
  name: string;
  zone: string;
  floor: string | null;
  row_label: string | null;
  column_label: string | null;
  status: string;
  is_available: boolean;
  is_mine: boolean;
};
type SeatRequest = {
  id: string;
  requested_seat_id: string | null;
  requested_start_date: string;
  requested_end_date: string | null;
  note: string | null;
  status: string;
  rejection_reason: string | null;
  requested_seat: Seat | null;
  assigned_seat: Seat | null;
};

const labels: Record<string, string> = {
  pending: "대기",
  approved: "배정",
  rejected: "반려",
  cancelled: "취소",
};

export function UserSeatingClient() {
  const [data, setData] = useState<{
    seats: Seat[];
    requests: SeatRequest[];
  }>({ seats: [], requests: [] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seatId, setSeatId] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await operationRequest<{
        seats: Seat[];
        requests: SeatRequest[];
        pagination: { hasMore: boolean };
      }>(`/api/seating?page=${page}`);
      setData(result);
      setHasMore(result.pagination.hasMore);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, [load]);

  function reset() {
    setEditingId(null);
    setSeatId("");
    setStartDate(today());
    setEndDate("");
    setNote("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await operationRequest("/api/seating", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          action: editingId ? "update" : undefined,
          requestedSeatId: seatId,
          requestedStartDate: startDate,
          requestedEndDate: endDate,
          note,
        }),
      });
      toast.success(
        editingId ? "좌석 요청을 수정했습니다." : "좌석을 신청했습니다.",
      );
      reset();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "신청에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      await operationRequest("/api/seating", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "cancel" }),
      });
      toast.success("좌석 요청을 취소했습니다.");
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
      title="좌석"
      description="사무실 좌석 현황을 보고 원하는 좌석을 신청합니다."
    >
      <OperationsSection title="좌석 현황">
        {loading ? (
          <OperationLoading label="좌석 현황을 불러오는 중" />
        ) : data.seats.length === 0 ? (
          <OperationEmpty>등록된 좌석이 없습니다.</OperationEmpty>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {data.seats.map((seat) => (
              <button
                key={seat.id}
                type="button"
                aria-pressed={seatId === seat.id}
                disabled={!seat.is_available}
                onClick={() => seat.is_available && setSeatId(seat.id)}
                className={`rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 ${
                  seat.is_mine
                    ? "border-emerald-300 bg-emerald-50"
                    : seatId === seat.id
                      ? "border-slate-950 bg-slate-50"
                      : seat.is_available
                        ? "border-slate-200 hover:border-slate-400"
                        : "border-slate-100 bg-slate-100 text-slate-400"
                }`}
              >
                <p className="font-semibold">{seat.code}</p>
                <p className="text-xs">{seat.name}</p>
                <p className="mt-2 text-[11px]">
                  {seat.zone}
                  {seat.floor ? ` · ${seat.floor}` : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </OperationsSection>

      <OperationsSection title={editingId ? "요청 수정" : "좌석 신청"}>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-600">
            희망 좌석
            <select
              name="seatId"
              required
              value={seatId}
              onChange={(event) => setSeatId(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            >
              <option value="">선택</option>
              {data.seats
                .filter((seat) => seat.status === "available")
                .map((seat) => (
                  <option key={seat.id} value={seat.id}>
                    {seat.code} · {seat.name} · {seat.zone}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            시작일
            <input
              name="requestedStartDate"
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
              name="requestedEndDate"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-3">
            메모
            <textarea
              name="note"
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
                className={operationSecondaryButtonClass}
                onClick={reset}
              >
                수정 취소
              </button>
            )}
          </div>
        </form>
      </OperationsSection>

      <OperationsSection title="신청 이력">
        {loading ? (
          <OperationLoading label="좌석 신청 이력을 불러오는 중" />
        ) : data.requests.length === 0 ? (
          <OperationEmpty>좌석 신청 이력이 없습니다.</OperationEmpty>
        ) : (
          <div className="space-y-2">
            {data.requests.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-950">
                    {item.requested_seat?.code ?? "좌석 미지정"} ·{" "}
                    {item.requested_start_date}
                    {item.requested_end_date && ` ~ ${item.requested_end_date}`}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.assigned_seat
                      ? `배정: ${item.assigned_seat.code}`
                      : item.note || item.rejection_reason || "메모 없음"}
                  </p>
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
                          setSeatId(item.requested_seat_id ?? "");
                          setStartDate(item.requested_start_date);
                          setEndDate(item.requested_end_date ?? "");
                          setNote(item.note ?? "");
                        }}
                      >
                        수정
                      </button>
                      <OperationConfirmDialog
                        title="좌석 신청을 취소할까요?"
                        description="취소한 신청은 관리자 처리 대상에서 제외됩니다."
                        confirmLabel="신청 취소"
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
