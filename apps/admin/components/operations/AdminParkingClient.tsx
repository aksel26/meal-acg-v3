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

type Member = { id: string; full_name: string };
type Parking = {
  id: string;
  member_id: string;
  vehicle_plate: string;
  vehicle_name: string;
  vehicle_type: string;
  requested_start_date: string;
  requested_end_date: string | null;
  note: string | null;
  admin_note: string | null;
  rejection_reason: string | null;
  status: string;
  member: Member;
};
const labels: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  expired: "만료",
  cancelled: "취소",
  archived: "보관",
};

export function AdminParkingClient() {
  const [items, setItems] = useState<Parking[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (statusFilter) params.set("status", statusFilter);
        if (memberFilter.trim()) params.set("member", memberFilter.trim());
        const data = await adminOperationRequest<{
          registrations: Parking[];
          members: Member[];
          pagination: { hasMore: boolean };
        }>(`/api/parking?${params}`, { signal });
        setItems(data.registrations);
        setMembers(data.members);
        setHasMore(data.pagination.hasMore);
        setMemberId((current) => current || data.members[0]?.id || "");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [memberFilter, page, statusFilter],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((error) => {
      if (error.name !== "AbortError") toast.error(error.message);
    });
    return () => controller.abort();
  }, [load]);

  function reset() {
    setEditingId(null);
    setMemberId(members[0]?.id ?? "");
    setPlate("");
    setVehicleName("");
    setVehicleType("");
    setStartDate(today());
    setEndDate("");
    setNote("");
    setAdminNote("");
  }

  async function requestApi(
    method: "POST" | "PATCH" | "DELETE",
    body?: Record<string, unknown>,
    id?: string,
  ) {
    setBusy(true);
    try {
      await adminOperationRequest(
        method === "DELETE" ? `/api/parking?id=${id}` : "/api/parking",
        {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      toast.success("처리했습니다.");
      reset();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "처리에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await requestApi(editingId ? "PATCH" : "POST", {
      id: editingId,
      action: editingId ? "update" : undefined,
      memberId,
      vehiclePlate: plate,
      vehicleName,
      vehicleType,
      requestedStartDate: startDate,
      requestedEndDate: endDate,
      note,
      adminNote,
    });
  }

  return (
    <OperationsPage
      variant="admin"
      title="주차 관리"
      description="직원 차량 등록을 검토하고 승인·만료·보관 처리합니다."
    >
      <OperationsSection
        key={editingId ?? "new-parking"}
        title={editingId ? "등록 수정" : "등록 추가"}
        collapsible
        defaultOpen={Boolean(editingId)}
      >
        <form onSubmit={save} className="grid gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-600">
            직원
            <select
              disabled={Boolean(editingId)}
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </label>
          {[
            ["차량번호", plate, setPlate],
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
              required
              type="date"
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
          <label className="text-sm text-slate-600">
            메모
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600">
            관리자 메모
            <input
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
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
                새 등록
              </button>
            )}
          </div>
        </form>
      </OperationsSection>

      <OperationsSection title="등록 필터">
        <div className="grid gap-3 md:grid-cols-2">
          <select
            aria-label="주차 등록 상태 필터"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className={operationInputClass}
          >
            <option value="">전체 상태</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label="직원명 검색"
            name="memberSearch"
            value={memberFilter}
            onChange={(event) => {
              setMemberFilter(event.target.value);
              setPage(1);
            }}
            className={operationInputClass}
            placeholder="예: 홍길동…"
          />
        </div>
      </OperationsSection>

      <OperationsSection title="전체 등록">
        {loading ? (
          <OperationLoading label="주차 등록 내역을 불러오는 중" />
        ) : items.length === 0 ? (
          <OperationEmpty>조건에 맞는 등록이 없습니다.</OperationEmpty>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {item.vehicle_plate} · {item.member?.full_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.vehicle_name} · {item.vehicle_type} ·{" "}
                      {item.requested_start_date}
                      {item.requested_end_date &&
                        ` ~ ${item.requested_end_date}`}
                    </p>
                  </div>
                  <OperationStatus value={item.status} labels={labels} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={operationSecondaryButtonClass}
                    onClick={() => {
                      setEditingId(item.id);
                      setMemberId(item.member_id);
                      setPlate(item.vehicle_plate);
                      setVehicleName(item.vehicle_name);
                      setVehicleType(item.vehicle_type);
                      setStartDate(item.requested_start_date);
                      setEndDate(item.requested_end_date ?? "");
                      setNote(item.note ?? "");
                      setAdminNote(item.admin_note ?? "");
                    }}
                  >
                    수정
                  </button>
                  {item.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className={operationButtonClass}
                        onClick={() =>
                          requestApi("PATCH", {
                            id: item.id,
                            action: "approve",
                          })
                        }
                      >
                        승인
                      </button>
                      <OperationReasonDialog
                        title="주차 등록을 반려할까요?"
                        description="신청자에게 표시할 반려 사유를 입력해주세요."
                        label="반려 사유"
                        confirmLabel="반려"
                        onConfirm={(reason) =>
                          requestApi("PATCH", {
                            id: item.id,
                            action: "reject",
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
                    </>
                  )}
                  {item.status === "approved" && (
                    <button
                      type="button"
                      className={operationSecondaryButtonClass}
                      onClick={() =>
                        requestApi("PATCH", { id: item.id, action: "expire" })
                      }
                    >
                      만료
                    </button>
                  )}
                  {["pending", "approved"].includes(item.status) && (
                    <OperationConfirmDialog
                      title="주차 등록을 취소할까요?"
                      description="승인 또는 대기 중인 등록이 취소 상태로 변경됩니다."
                      confirmLabel="등록 취소"
                      onConfirm={() =>
                        requestApi("PATCH", { id: item.id, action: "cancel" })
                      }
                    >
                      <button
                        type="button"
                        className={operationDangerButtonClass}
                      >
                        취소
                      </button>
                    </OperationConfirmDialog>
                  )}
                  {["approved", "rejected", "expired", "cancelled"].includes(
                    item.status,
                  ) && (
                    <button
                      type="button"
                      className={operationSecondaryButtonClass}
                      onClick={() =>
                        requestApi("PATCH", { id: item.id, action: "archive" })
                      }
                    >
                      보관
                    </button>
                  )}
                  {["pending", "rejected", "cancelled"].includes(
                    item.status,
                  ) && (
                    <OperationConfirmDialog
                      title="주차 등록을 삭제할까요?"
                      description="삭제한 등록은 복구할 수 없습니다."
                      confirmLabel="등록 삭제"
                      onConfirm={() => requestApi("DELETE", undefined, item.id)}
                    >
                      <button
                        type="button"
                        className={operationDangerButtonClass}
                      >
                        삭제
                      </button>
                    </OperationConfirmDialog>
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
