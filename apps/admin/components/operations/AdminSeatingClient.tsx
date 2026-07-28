"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@repo/ui/src/sonner";
import {
  OperationConfirmDialog,
  OperationEmpty,
  OperationLoading,
  OperationPagination,
  OperationReasonDialog,
  OperationsPage,
  OperationsSection,
  OperationStatus,
  operationButtonClass,
  operationDangerButtonClass,
  operationInputClass,
  operationSecondaryButtonClass,
} from "@repo/ui/src/operations";
import { adminOperationRequest, today } from "./client";

type Seat = {
  id: string;
  code: string;
  name: string;
  zone: string;
  floor: string | null;
  row_label: string | null;
  column_label: string | null;
  status: string;
  note: string | null;
};
type SeatRequest = {
  id: string;
  requested_seat_id: string | null;
  requested_start_date: string;
  requested_end_date: string | null;
  note: string | null;
  status: string;
  member: { id: string; full_name: string };
  requested_seat: Seat | null;
  assigned_seat: Seat | null;
};
type Assignment = {
  id: string;
  start_date: string;
  end_date: string | null;
  status: string;
  member: { id: string; full_name: string };
  seat: Seat;
};
const requestLabels: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
};

export function AdminSeatingClient() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [requests, setRequests] = useState<SeatRequest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [floor, setFloor] = useState("");
  const [rowLabel, setRowLabel] = useState("");
  const [columnLabel, setColumnLabel] = useState("");
  const [status, setStatus] = useState("available");
  const [note, setNote] = useState("");
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminOperationRequest<{
        seats: Seat[];
        requests: SeatRequest[];
        assignments: Assignment[];
        pagination: { hasMore: boolean };
      }>(`/api/seating?page=${page}`);
      setSeats(data.seats);
      setRequests(data.requests);
      setAssignments(data.assignments);
      setHasMore(data.pagination.hasMore);
      setSelectedSeats((current) => {
        const next = { ...current };
        data.requests.forEach((item) => {
          next[item.id] ||= item.requested_seat_id ?? data.seats[0]?.id ?? "";
        });
        data.assignments.forEach((item) => {
          next[item.id] ||=
            data.seats.find((seat) => seat.id !== item.seat.id)?.id ?? "";
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, [load]);

  function reset() {
    setEditingId(null);
    setCode("");
    setName("");
    setZone("");
    setFloor("");
    setRowLabel("");
    setColumnLabel("");
    setStatus("available");
    setNote("");
  }

  async function saveSeat(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await adminOperationRequest("/api/seating", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          action: editingId ? "update_seat" : undefined,
          code,
          name,
          zone,
          floor,
          rowLabel,
          columnLabel,
          status,
          note,
        }),
      });
      toast.success("좌석을 저장했습니다.");
      reset();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await adminOperationRequest("/api/seating", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success("처리했습니다.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "처리에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteSeat(id: string) {
    setBusy(true);
    try {
      await adminOperationRequest(`/api/seating?id=${id}`, {
        method: "DELETE",
      });
      toast.success("좌석을 삭제했습니다.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationsPage
      variant="admin"
      title="좌석 관리"
      description="좌석 기준정보와 신청·배정 상태를 관리합니다."
    >
      <OperationsSection
        key={editingId ?? "new-seat"}
        title={editingId ? "좌석 수정" : "좌석 추가"}
        collapsible
        defaultOpen={Boolean(editingId)}
      >
        <form onSubmit={saveSeat} className="grid gap-3 md:grid-cols-4">
          {[
            ["코드", code, setCode, true],
            ["이름", name, setName, true],
            ["구역", zone, setZone, true],
            ["층", floor, setFloor, false],
            ["행", rowLabel, setRowLabel, false],
            ["열", columnLabel, setColumnLabel, false],
          ].map(([label, value, setter, required]) => (
            <label key={label as string} className="text-sm text-slate-600">
              {label as string}
              <input
                required={required as boolean}
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
            상태
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            >
              <option value="available">사용 가능</option>
              <option value="disabled">사용중지</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            메모
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <div className="flex gap-2 md:col-span-4">
            <button disabled={busy} className={operationButtonClass}>
              저장
            </button>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                className={operationSecondaryButtonClass}
              >
                새 좌석
              </button>
            )}
          </div>
        </form>
      </OperationsSection>

      <OperationsSection title="좌석 목록">
        {loading ? (
          <OperationLoading label="좌석 목록을 불러오는 중" />
        ) : seats.length === 0 ? (
          <OperationEmpty>등록된 좌석이 없습니다.</OperationEmpty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {seats.map((seat) => (
              <div
                key={seat.id}
                className="rounded-xl border border-slate-100 p-3"
              >
                <p className="font-semibold">
                  {seat.code} · {seat.name}
                </p>
                <p className="text-sm text-slate-500">
                  {seat.zone} {seat.floor}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className={operationSecondaryButtonClass}
                    onClick={() => {
                      setEditingId(seat.id);
                      setCode(seat.code);
                      setName(seat.name);
                      setZone(seat.zone);
                      setFloor(seat.floor ?? "");
                      setRowLabel(seat.row_label ?? "");
                      setColumnLabel(seat.column_label ?? "");
                      setStatus(seat.status);
                      setNote(seat.note ?? "");
                    }}
                  >
                    수정
                  </button>
                  <OperationConfirmDialog
                    title="좌석을 삭제할까요?"
                    description="배정 또는 신청 이력이 있는 좌석은 삭제할 수 없습니다."
                    confirmLabel="좌석 삭제"
                    onConfirm={() => deleteSeat(seat.id)}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      className={operationDangerButtonClass}
                    >
                      삭제
                    </button>
                  </OperationConfirmDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </OperationsSection>

      <OperationsSection title="좌석 신청">
        {loading ? (
          <OperationLoading label="좌석 신청을 불러오는 중" />
        ) : requests.length === 0 ? (
          <OperationEmpty>좌석 신청이 없습니다.</OperationEmpty>
        ) : (
          <div className="space-y-2">
            {requests.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {item.member?.full_name} ·{" "}
                      {item.requested_seat?.code ?? "미지정"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.requested_start_date}
                      {item.requested_end_date &&
                        ` ~ ${item.requested_end_date}`}
                    </p>
                  </div>
                  <OperationStatus value={item.status} labels={requestLabels} />
                </div>
                {item.status === "pending" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <select
                      aria-label={`${item.member?.full_name} 배정 좌석`}
                      value={selectedSeats[item.id] ?? ""}
                      onChange={(event) =>
                        setSelectedSeats((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      className={`${operationInputClass} max-w-64`}
                    >
                      {seats
                        .filter((seat) => seat.status === "available")
                        .map((seat) => (
                          <option key={seat.id} value={seat.id}>
                            {seat.code} · {seat.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy}
                      className={operationButtonClass}
                      onClick={() =>
                        mutate({
                          id: item.id,
                          action: "approve_request",
                          seatId: selectedSeats[item.id],
                          startDate: item.requested_start_date,
                          endDate: item.requested_end_date,
                        })
                      }
                    >
                      배정 승인
                    </button>
                    <OperationReasonDialog
                      title="좌석 신청을 반려할까요?"
                      description="신청자에게 표시할 반려 사유를 입력해주세요."
                      label="반려 사유"
                      confirmLabel="반려"
                      onConfirm={(reason) =>
                        mutate({
                          id: item.id,
                          action: "reject_request",
                          reason,
                        })
                      }
                    >
                      <button
                        type="button"
                        className={operationDangerButtonClass}
                      >
                        반려
                      </button>
                    </OperationReasonDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </OperationsSection>

      <OperationsSection title="배정 현황">
        {loading ? (
          <OperationLoading label="좌석 배정 현황을 불러오는 중" />
        ) : assignments.filter((item) => item.status === "active").length ===
          0 ? (
          <OperationEmpty>활성 배정이 없습니다.</OperationEmpty>
        ) : (
          <div className="space-y-2">
            {assignments
              .filter((item) => item.status === "active")
              .map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {item.seat?.code} · {item.member?.full_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.start_date}
                      {item.end_date && ` ~ ${item.end_date}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      aria-label={`${item.member?.full_name} 이동 좌석`}
                      value={selectedSeats[item.id] ?? ""}
                      onChange={(event) =>
                        setSelectedSeats((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      className={`${operationInputClass} max-w-56`}
                    >
                      {seats
                        .filter(
                          (seat) =>
                            seat.status === "available" &&
                            seat.id !== item.seat?.id,
                        )
                        .map((seat) => (
                          <option key={seat.id} value={seat.id}>
                            {seat.code} · {seat.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className={operationSecondaryButtonClass}
                      onClick={() =>
                        mutate({
                          id: item.id,
                          action: "move_assignment",
                          seatId: selectedSeats[item.id],
                          startDate: today(),
                        })
                      }
                    >
                      이동
                    </button>
                    <OperationConfirmDialog
                      title="좌석 배정을 종료할까요?"
                      description="현재 배정이 종료되고 좌석은 다시 사용 가능 상태가 됩니다."
                      confirmLabel="배정 종료"
                      onConfirm={() =>
                        mutate({ id: item.id, action: "end_assignment" })
                      }
                    >
                      <button type="button" className={operationButtonClass}>
                        종료
                      </button>
                    </OperationConfirmDialog>
                    <OperationConfirmDialog
                      title="좌석 배정을 취소할까요?"
                      description="현재 배정이 취소되고 좌석은 다시 사용 가능 상태가 됩니다."
                      confirmLabel="배정 취소"
                      onConfirm={() =>
                        mutate({ id: item.id, action: "cancel_assignment" })
                      }
                    >
                      <button
                        type="button"
                        className={operationDangerButtonClass}
                      >
                        취소
                      </button>
                    </OperationConfirmDialog>
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
