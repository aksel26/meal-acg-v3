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
  OperationIconButton,
  OperationLoading,
  OperationPagination,
  OperationReasonDialog,
  OperationToolbar,
  OperationsPage,
  OperationsSection,
  OperationStatus,
  operationButtonClass,
  operationIconButtonClass,
  operationInputClass,
  operationSecondaryButtonClass,
} from "@repo/ui/src/operations";
import {
  Archive,
  Check,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  AdminRichTextEditor,
  EMPTY_RICH_TEXT_DOCUMENT,
  type RichTextDocument,
} from "./AdminRichTextEditor";
import { adminOperationRequest, today } from "./client";
import {
  PARKING_TICKET_OPTIONS,
  PARKING_USAGE_TYPE_LABELS,
  parkingTotalFee,
  type ParkingTicketCode,
  type ParkingUsageType,
} from "utils/company-operations";

type Member = { id: string; full_name: string };
type Parking = {
  id: string;
  member_id: string;
  vehicle_plate: string;
  vehicle_name: string;
  vehicle_type: string;
  requested_start_date: string;
  ticket_code: ParkingTicketCode;
  extra_ticket_codes: ParkingTicketCode[] | null;
  usage_type: ParkingUsageType;
  note: string | null;
  admin_note: string | null;
  rejection_reason: string | null;
  status: string;
  member: Member;
};
type ParkingNotice = {
  content: RichTextDocument;
  updated_at: string;
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

export function AdminParkingClient() {
  const [items, setItems] = useState<Parking[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [parkingDate, setParkingDate] = useState(today());
  const [ticketCode, setTicketCode] = useState<ParkingTicketCode>("two_hours");
  const [extraTickets, setExtraTickets] = useState<ParkingTicketCode[]>([]);
  const [extraDraft, setExtraDraft] =
    useState<ParkingTicketCode>("extra_30_minutes");
  const [usageType, setUsageType] = useState<ParkingUsageType>("business");
  const [note, setNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<RichTextDocument>(
    EMPTY_RICH_TEXT_DOCUMENT,
  );
  const [noticeDraft, setNoticeDraft] = useState<RichTextDocument>(
    EMPTY_RICH_TEXT_DOCUMENT,
  );
  const [noticeEditing, setNoticeEditing] = useState(false);
  const [noticeBusy, setNoticeBusy] = useState(false);
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
          notice: ParkingNotice;
          pagination: { hasMore: boolean };
        }>(`/api/parking?${params}`, { signal });
        setItems(data.registrations);
        setMembers(data.members);
        setNotice(data.notice.content);
        setNoticeDraft(data.notice.content);
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
    setParkingDate(today());
    setTicketCode("two_hours");
    setExtraTickets([]);
    setExtraDraft("extra_30_minutes");
    setUsageType("business");
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
      setFormOpen(false);
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
      requestedDate: parkingDate,
      ticketCode,
      extraTicketCodes: extraTickets,
      usageType,
      note,
      adminNote,
    });
  }

  async function saveNotice() {
    setNoticeBusy(true);
    try {
      const data = await adminOperationRequest<ParkingNotice>("/api/parking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_notice",
          content: noticeDraft,
        }),
      });
      setNotice(data.content);
      setNoticeDraft(data.content);
      setNoticeEditing(false);
      toast.success("주차 공지를 저장했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "공지 저장에 실패했습니다.",
      );
    } finally {
      setNoticeBusy(false);
    }
  }

  return (
    <OperationsPage
      variant="admin"
      title="주차 관리"
      description="직원 차량 등록을 검토하고 승인·만료·보관 처리합니다."
    >
      <OperationFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) reset();
        }}
        title={editingId ? "등록 수정" : "등록 추가"}
        description="직원 차량, 이용일과 발급할 주차 시간권을 입력해주세요."
      >
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-600">
            직원
            <Select
              disabled={Boolean(editingId)}
              value={memberId}
              onValueChange={setMemberId}
            >
              <SelectTrigger className="mt-1 w-full data-[size=default]:h-10">
                <SelectValue placeholder="직원 선택" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-sm text-slate-600">
            주차 일자
            <DatePicker
              modal
              value={parkingDate}
              ariaLabel="주차 일자"
              placeholder="주차 일자 선택"
              className="mt-1 h-10"
              onChange={setParkingDate}
            />
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
            주차 시간권
            <Select
              value={ticketCode}
              onValueChange={(value) =>
                setTicketCode(value as ParkingTicketCode)
              }
            >
              <SelectTrigger className="mt-1 w-full data-[size=default]:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                {PARKING_TICKET_OPTIONS.map((ticket) => (
                  <SelectItem key={ticket.code} value={ticket.code}>
                    {ticket.label} · {feeLabel(ticket.fee)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="mt-1 block text-xs text-slate-500">
              2시간 초과 시 필요한 추가 시간권을 선택합니다.
            </span>
          </label>
          <div className="text-sm text-slate-600 sm:col-span-2">
            추가 시간권
            <div className="mt-1 flex gap-2">
              <Select
                value={extraDraft}
                onValueChange={(value) =>
                  setExtraDraft(value as ParkingTicketCode)
                }
              >
                <SelectTrigger
                  aria-label="추가할 주차 시간권"
                  className="w-full data-[size=default]:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  {PARKING_TICKET_OPTIONS.map((ticket) => (
                    <SelectItem key={ticket.code} value={ticket.code}>
                      {ticket.label} · {feeLabel(ticket.fee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                className={operationSecondaryButtonClass}
                onClick={() =>
                  setExtraTickets((current) => [...current, extraDraft])
                }
              >
                추가
              </button>
            </div>
            {extraTickets.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {extraTickets.map((code, index) => (
                  <li
                    key={`${code}-${index}`}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                  >
                    {ticketLabel(code)}
                    <button
                      type="button"
                      aria-label={`${ticketLabel(code)} 제거`}
                      className="text-slate-400 transition-colors hover:text-rose-600"
                      onClick={() =>
                        setExtraTickets((current) =>
                          current.filter((_, position) => position !== index),
                        )
                      }
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-500">
                기본 {ticketLabel(ticketCode)}
                {extraTickets.length > 0 && ` · 추가 ${extraTickets.length}건`}
              </span>
              <span className="font-semibold text-slate-950">
                합계 {feeLabel(parkingTotalFee(ticketCode, extraTickets))}
              </span>
            </p>
          </div>
          <label className="text-sm text-slate-600 sm:col-span-2">
            주차 구분
            <Select
              value={usageType}
              onValueChange={(value) => setUsageType(value as ParkingUsageType)}
            >
              <SelectTrigger className="mt-1 w-full data-[size=default]:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[60]">
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
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className={operationSecondaryButtonClass}
            >
              취소
            </button>
            <button
              disabled={busy || !parkingDate}
              className={operationButtonClass}
            >
              저장
            </button>
          </div>
        </form>
      </OperationFormDialog>

      <div className="grid gap-4 lg:grid-cols-10">
        <div className="min-w-0 lg:col-span-3 [&>[data-operations-section]]:h-full">
          <OperationsSection title="주차 이용 안내">
            <OperationToolbar
              action={
                noticeEditing ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={operationSecondaryButtonClass}
                      onClick={() => {
                        setNoticeDraft(notice);
                        setNoticeEditing(false);
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      disabled={noticeBusy}
                      className={operationButtonClass}
                      onClick={() => void saveNotice()}
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={operationSecondaryButtonClass}
                    onClick={() => {
                      setNoticeDraft(notice);
                      setNoticeEditing(true);
                    }}
                  >
                    공지 편집
                  </button>
                )
              }
            />
            <AdminRichTextEditor
              value={noticeEditing ? noticeDraft : notice}
              editable={noticeEditing}
              onChange={setNoticeDraft}
            />
          </OperationsSection>
        </div>

        <div className="min-w-0 lg:col-span-7 [&>[data-operations-section]]:h-full">
          <OperationsSection title="등록 현황">
            <OperationToolbar
              action={
                items.length > 0 ? (
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
                ) : undefined
              }
            >
              <Select
                value={statusFilter || "all"}
                onValueChange={(value) => {
                  setStatusFilter(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="주차 등록 상태 필터"
                  className="w-32 data-[size=default]:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  {Object.entries(labels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                aria-label="직원명 검색"
                name="memberSearch"
                value={memberFilter}
                onChange={(event) => {
                  setMemberFilter(event.target.value);
                  setPage(1);
                }}
                className={operationInputClass}
                placeholder="직원명 검색"
              />
            </OperationToolbar>
            {loading ? (
              <OperationLoading label="주차 등록 내역을 불러오는 중" />
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
                    등록 추가
                  </button>
                }
              >
                조건에 맞는 등록이 없습니다.
              </OperationEmpty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="px-3 py-1.5 font-medium">직원</th>
                      <th className="px-3 py-1.5 font-medium">차량</th>
                      <th className="px-3 py-1.5 font-medium">주차 일자</th>
                      <th className="px-3 py-1.5 font-medium">시간권</th>
                      <th className="px-3 py-1.5 font-medium">구분</th>
                      <th className="px-3 py-1.5 font-medium">주차비</th>
                      <th className="px-3 py-1.5 font-medium">상태</th>
                      <th className="px-3 py-1.5 font-medium">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="align-middle">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-950">
                          {item.member?.full_name}
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-slate-700">{item.vehicle_plate}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {item.vehicle_name} · {item.vehicle_type}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {item.requested_start_date}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <p>{ticketLabel(item.ticket_code)}</p>
                          {(item.extra_ticket_codes?.length ?? 0) > 0 && (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              추가{" "}
                              {item.extra_ticket_codes
                                ?.map((code) => ticketLabel(code))
                                .join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {PARKING_USAGE_TYPE_LABELS[item.usage_type]}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums text-slate-900">
                          {feeLabel(
                            parkingTotalFee(
                              item.ticket_code,
                              item.extra_ticket_codes ?? [],
                            ),
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <OperationStatus
                            value={item.status}
                            labels={labels}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            <OperationIconButton
                              label="수정"
                              onClick={() => {
                                setEditingId(item.id);
                                setMemberId(item.member_id);
                                setPlate(item.vehicle_plate);
                                setVehicleName(item.vehicle_name);
                                setVehicleType(item.vehicle_type);
                                setParkingDate(item.requested_start_date);
                                setTicketCode(item.ticket_code);
                                setExtraTickets(item.extra_ticket_codes ?? []);
                                setExtraDraft("extra_30_minutes");
                                setUsageType(item.usage_type);
                                setNote(item.note ?? "");
                                setAdminNote(item.admin_note ?? "");
                                setFormOpen(true);
                              }}
                            >
                              <Pencil
                                className="h-3.5 w-3.5"
                                strokeWidth={1.5}
                              />
                            </OperationIconButton>
                            {item.status === "pending" && (
                              <>
                                <OperationIconButton
                                  label="승인"
                                  tone="primary"
                                  onClick={() =>
                                    requestApi("PATCH", {
                                      id: item.id,
                                      action: "approve",
                                    })
                                  }
                                >
                                  <Check
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.5}
                                  />
                                </OperationIconButton>
                                <OperationReasonDialog
                                  title="주차 등록을 반려할까요?"
                                  description="신청자에게 표시할 반려 사유를 입력해주세요."
                                  label="반려 사유"
                                  confirmLabel="반려"
                                  tooltip="반려"
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
                                    aria-label="반려"
                                    className={operationIconButtonClass(
                                      "danger",
                                    )}
                                  >
                                    <X
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.5}
                                    />
                                  </button>
                                </OperationReasonDialog>
                              </>
                            )}
                            {item.status === "approved" && (
                              <OperationIconButton
                                label="만료"
                                onClick={() =>
                                  requestApi("PATCH", {
                                    id: item.id,
                                    action: "expire",
                                  })
                                }
                              >
                                <RotateCcw
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
                              </OperationIconButton>
                            )}
                            {["pending", "approved"].includes(item.status) && (
                              <OperationConfirmDialog
                                title="주차 등록을 취소할까요?"
                                description="승인 또는 대기 중인 등록이 취소 상태로 변경됩니다."
                                confirmLabel="등록 취소"
                                tooltip="등록 취소"
                                onConfirm={() =>
                                  requestApi("PATCH", {
                                    id: item.id,
                                    action: "cancel",
                                  })
                                }
                              >
                                <button
                                  type="button"
                                  aria-label="등록 취소"
                                  className={operationIconButtonClass("danger")}
                                >
                                  <Undo2
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.5}
                                  />
                                </button>
                              </OperationConfirmDialog>
                            )}
                            {[
                              "approved",
                              "rejected",
                              "expired",
                              "cancelled",
                            ].includes(item.status) && (
                              <OperationIconButton
                                label="보관"
                                onClick={() =>
                                  requestApi("PATCH", {
                                    id: item.id,
                                    action: "archive",
                                  })
                                }
                              >
                                <Archive
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
                              </OperationIconButton>
                            )}
                            {["pending", "rejected", "cancelled"].includes(
                              item.status,
                            ) && (
                              <OperationConfirmDialog
                                title="주차 등록을 삭제할까요?"
                                description="삭제한 등록은 복구할 수 없습니다."
                                confirmLabel="등록 삭제"
                                tooltip="삭제"
                                onConfirm={() =>
                                  requestApi("DELETE", undefined, item.id)
                                }
                              >
                                <button
                                  type="button"
                                  aria-label="삭제"
                                  className={operationIconButtonClass("danger")}
                                >
                                  <Trash2
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.5}
                                  />
                                </button>
                              </OperationConfirmDialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <OperationPagination
              page={page}
              hasMore={hasMore}
              disabled={loading || busy}
              onPageChange={setPage}
            />
          </OperationsSection>
        </div>
      </div>
    </OperationsPage>
  );
}
