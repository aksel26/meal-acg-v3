"use client";

import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, Send, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@repo/ui/src/button";
import {
  BaseSelect,
  BaseSelectContent,
  BaseSelectGroup,
  BaseSelectItem,
  BaseSelectTrigger,
  BaseSelectValue,
} from "@repo/ui/src/base-select";
import { Calendar } from "@repo/ui/src/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Label } from "@repo/ui/src/label";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import { Textarea } from "@repo/ui/src/textarea";
import { toast } from "@repo/ui/src/sonner";
import { useCreateLeaveRequest } from "@/hooks/use-approvals";
import {
  useDayoffDetail,
  useDayoffsYearly,
  type DayoffRecord,
} from "@/hooks/use-dayoffs";
import { useDeleteDayoff, useUpdateDayoff } from "@/hooks/use-dayoff-mutations";
import { useUserStore } from "@/stores/userStore";
import DayoffDeleteDialog from "./DayoffDeleteDialog";

interface LeaveType {
  id: number;
  name: string;
  category: string;
}

interface MemberOption {
  id: string;
  full_name: string;
  member_role: string | null;
  team_name: string | null;
}

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecord?: DayoffRecord | null;
  memberId?: string | null;
}

export function LeaveRequestDialog({
  open,
  onOpenChange,
  editingRecord = null,
  memberId: memberIdProp,
}: LeaveRequestDialogProps) {
  const storedMemberId = useUserStore((state) => state.memberId);
  const memberId = memberIdProp ?? storedMemberId ?? null;
  const createRequest = useCreateLeaveRequest();
  const updateRequest = useUpdateDayoff();
  const deleteRequest = useDeleteDayoff();
  const { data: recordDetail } = useDayoffDetail(editingRecord?.id ?? null);
  const activeRecord = recordDetail ?? editingRecord;
  const isEditing = !!editingRecord;
  const requiresEditReason =
    isEditing &&
    ["pre_approved", "approved"].includes(activeRecord?.approval_status ?? "");
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [approvers, setApprovers] = useState<MemberOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [reason, setReason] = useState("");
  const [approverId, setApproverId] = useState("");
  const [ccMemberIds, setCcMemberIds] = useState<string[]>([]);
  const [editReason, setEditReason] = useState("");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { data: myLeaveRequests } = useDayoffsYearly(memberId, calendarYear);

  useEffect(() => {
    if (!open || !memberId) return;

    const controller = new AbortController();
    setLoadingOptions(true);

    Promise.all([
      fetch("/api/leave-types", { signal: controller.signal }),
      fetch("/api/leave-requests", { signal: controller.signal }),
    ])
      .then(async ([leaveTypesResponse, optionsResponse]) => {
        const [leaveTypesData, optionsData] = await Promise.all([
          leaveTypesResponse.json(),
          optionsResponse.json(),
        ]);

        if (!leaveTypesResponse.ok) {
          throw new Error(
            leaveTypesData.error || "휴가 유형을 불러오지 못했습니다.",
          );
        }
        if (!optionsResponse.ok) {
          throw new Error(
            optionsData.error || "승인자 목록을 불러오지 못했습니다.",
          );
        }

        const nextLeaveTypes = Array.isArray(leaveTypesData)
          ? leaveTypesData.filter(
              (type: LeaveType) => type.category !== "지각/조퇴",
            )
          : [];
        const nextApprovers = Array.isArray(optionsData.approvers)
          ? optionsData.approvers
          : [];

        setLeaveTypes(nextLeaveTypes);
        setApprovers(nextApprovers);
        setMembers(
          Array.isArray(optionsData.members) ? optionsData.members : [],
        );
        if (!isEditing) {
          setApproverId((current) =>
            nextApprovers.some(
              (approver: MemberOption) => approver.id === current,
            )
              ? current
              : optionsData.default_approver_id || "",
          );
        }
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          toast.error(error.message);
          setLeaveTypes([]);
          setApprovers([]);
          setMembers([]);
          setApproverId("");
        }
      })
      .finally(() => setLoadingOptions(false));

    return () => controller.abort();
  }, [isEditing, memberId, open]);

  useEffect(() => {
    if (!open || !activeRecord) return;
    setStartDate(activeRecord.leave_date);
    setEndDate(activeRecord.leave_date);
    setLeaveTypeId(String(activeRecord.leave_type_id));
    setReason(activeRecord.reason ?? "");
    setApproverId(
      activeRecord.requested_approver_id ?? activeRecord.approver_id ?? "",
    );
    setCcMemberIds(activeRecord.cc_member_ids ?? []);
    setEditReason(activeRecord.edit_reason ?? "");
    setCalendarYear(Number(activeRecord.leave_date.slice(0, 4)));
    setCalendarMonth(Number(activeRecord.leave_date.slice(5, 7)));
  }, [activeRecord, open]);

  useEffect(() => {
    if (!open || isEditing) return;
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth() + 1);
  }, [isEditing, open]);

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setLeaveTypeId("");
    setReason("");
    setApproverId("");
    setCcMemberIds([]);
    setEditReason("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!memberId || !startDate || !leaveTypeId || !approverId) {
      toast.error("날짜, 유형, 승인자를 입력해주세요.");
      return;
    }

    if (isEditing && editingRecord) {
      if (requiresEditReason && !editReason.trim()) {
        toast.error("승인된 휴가 수정 시 수정 사유를 입력해주세요.");
        return;
      }
      updateRequest.mutate(
        {
          id: editingRecord.id,
          editorId: memberId,
          leaveDate: startDate,
          leaveTypeId: Number(leaveTypeId),
          approverId,
          ccMemberIds,
          reason,
          editReason,
        },
        { onSuccess: () => handleOpenChange(false) },
      );
      return;
    }

    createRequest.mutate(
      {
        memberId,
        startDate,
        endDate: endDate || startDate,
        leaveTypeId: Number(leaveTypeId),
        approverId,
        ccMemberIds,
        reason: reason || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(`휴가 신청이 완료되었습니다. (${data.dates_count}일)`);
          handleOpenChange(false);
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  const memberLabel = (member: MemberOption) =>
    [member.full_name, member.member_role, member.team_name]
      .filter(Boolean)
      .join(" · ");
  const selectedRange: DateRange | undefined = startDate
    ? {
        from: parse(startDate, "yyyy-MM-dd", new Date()),
        to: endDate ? parse(endDate, "yyyy-MM-dd", new Date()) : undefined,
      }
    : undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requestedDates = (myLeaveRequests ?? []).map((request) =>
    parse(request.leave_date, "yyyy-MM-dd", new Date()),
  );
  const visibleMonthRequests = (myLeaveRequests ?? [])
    .filter(
      (request) => Number(request.leave_date.slice(5, 7)) === calendarMonth,
    )
    .sort((a, b) => a.leave_date.localeCompare(b.leave_date));
  const isPending = createRequest.isPending || updateRequest.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[90vh] overflow-x-hidden overflow-y-auto rounded-2xl"
          style={{ maxWidth: "min(44.5rem, calc(100% - 2rem))" }}
        >
          <DialogHeader>
            <DialogTitle>{isEditing ? "휴가 상세" : "휴가 신청"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "신청 내역을 확인하고 수정하거나 삭제할 수 있습니다."
                : "기간을 선택하면 주말과 공휴일은 자동으로 제외됩니다."}
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid min-w-0 gap-6 md:grid-cols-[minmax(20rem,1fr)_minmax(20rem,1fr)]"
            onSubmit={handleSubmit}
          >
            <section className="min-w-0 space-y-2">
              <Label className="mb-2 block text-sm font-medium text-slate-700">
                휴가 기간 *
              </Label>
              <div className="flex min-w-0 justify-center overflow-hidden">
                <Calendar
                  mode="range"
                  showOutsideDays={false}
                  selected={selectedRange}
                  max={isEditing ? 1 : undefined}
                  onSelect={(range) => {
                    setStartDate(
                      range?.from ? format(range.from, "yyyy-MM-dd") : "",
                    );
                    setEndDate(range?.to ? format(range.to, "yyyy-MM-dd") : "");
                  }}
                  locale={ko}
                  defaultMonth={selectedRange?.from}
                  onMonthChange={(month) => {
                    setCalendarYear(month.getFullYear());
                    setCalendarMonth(month.getMonth() + 1);
                  }}
                  disabled={{ before: today }}
                  modifiers={{
                    requested: requestedDates,
                  }}
                  modifiersClassNames={{
                    requested:
                      "[&>button]:relative [&>button]:after:absolute [&>button]:after:bottom-0.5 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-violet-500",
                  }}
                  className="p-2 [--cell-size:2rem] sm:[--cell-size:2.25rem] md:[--cell-size:2.5rem]"
                />
              </div>
              {selectedRange?.from && (
                <p className="mt-2 text-center text-xs font-medium text-slate-600">
                  {format(selectedRange.from, "yyyy년 M월 d일", { locale: ko })}
                  {selectedRange.to &&
                    ` ~ ${format(selectedRange.to, "yyyy년 M월 d일", {
                      locale: ko,
                    })}`}
                </p>
              )}
            </section>

            <section className="min-w-0 space-y-4">
              <div>
                <h3 className="mb-1.5 text-sm font-medium text-slate-700">
                  {calendarMonth}월 나의 신청 내역
                </h3>
                {visibleMonthRequests.length > 0 ? (
                  <table className="w-full table-fixed text-sm">
                    <tbody>
                      {visibleMonthRequests.map((request) => (
                        <tr
                          key={request.id}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="w-20 py-2 text-slate-500">
                            {Number(request.leave_date.slice(8, 10))}일
                          </td>
                          <td className="py-2 font-medium text-slate-800">
                            {request.leave_type?.name ?? "휴가"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="py-2 text-sm text-slate-400">
                    신청 내역이 없습니다.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="leave-type"
                  className="text-sm font-medium text-slate-700"
                >
                  휴가 유형 *
                </Label>
                <BaseSelect
                  items={leaveTypes.map((type) => ({
                    label: type.name,
                    value: String(type.id),
                  }))}
                  value={leaveTypeId || null}
                  onValueChange={(value) => setLeaveTypeId(value ?? "")}
                  disabled={loadingOptions || leaveTypes.length === 0}
                >
                  <BaseSelectTrigger id="leave-type" className="w-full">
                    <BaseSelectValue
                      placeholder={
                        loadingOptions
                          ? "휴가 유형을 불러오는 중..."
                          : "유형을 선택하세요"
                      }
                    />
                  </BaseSelectTrigger>
                  <BaseSelectContent>
                    <BaseSelectGroup>
                      {leaveTypes.map((type) => (
                        <BaseSelectItem key={type.id} value={String(type.id)}>
                          {type.name}
                        </BaseSelectItem>
                      ))}
                    </BaseSelectGroup>
                  </BaseSelectContent>
                </BaseSelect>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  사유
                </Label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="사유를 입력하세요 (선택)"
                  rows={3}
                  maxLength={2000}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  승인자 *
                </Label>
                <SearchableDropdown
                  items={approvers}
                  value={approverId}
                  getItemKey={(member) => member.id}
                  getItemLabel={memberLabel}
                  onSelect={(member) => setApproverId(member.id)}
                  onClear={() => setApproverId("")}
                  placeholder={
                    loadingOptions
                      ? "승인자 목록을 불러오는 중..."
                      : "승인자를 검색하세요"
                  }
                  searchPlaceholder="이름, 직책, 팀 검색"
                  emptyText="선택할 수 있는 승인자가 없습니다."
                  allowClear
                  disabled={loadingOptions}
                  portal
                />
                {isEditing && (
                  <p className="text-xs text-slate-500">
                    승인자 변경 시 승인 상태가 대기로 변경됩니다.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  참조자
                </Label>
                <SearchableDropdown
                  items={members.filter(
                    (member) => !ccMemberIds.includes(member.id),
                  )}
                  getItemKey={(member) => member.id}
                  getItemLabel={memberLabel}
                  onSelect={(member) =>
                    setCcMemberIds((current) => [...current, member.id])
                  }
                  placeholder={
                    loadingOptions
                      ? "참조자 목록을 불러오는 중..."
                      : "참조자를 검색해 추가하세요"
                  }
                  searchPlaceholder="이름, 직책, 팀 검색"
                  emptyText="추가할 참조자가 없습니다."
                  disabled={loadingOptions}
                  portal
                />
                {ccMemberIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ccMemberIds.map((id) => {
                      const member = members.find((item) => item.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                          {member?.full_name || id}
                          <button
                            type="button"
                            onClick={() =>
                              setCcMemberIds((current) =>
                                current.filter((memberId) => memberId !== id),
                              )
                            }
                            aria-label={`${member?.full_name || "참조자"} 제거`}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  승인 상태:{" "}
                  <span className="font-medium text-slate-800">
                    {{
                      pending: "대기",
                      pre_approved: "가승인",
                      approved: "승인",
                      rejected: "반려",
                      draft: "임시",
                    }[activeRecord?.approval_status ?? ""] ?? "-"}
                  </span>
                </div>
              )}

              {requiresEditReason && (
                <div className="space-y-2">
                  <Label
                    htmlFor="leave-edit-reason"
                    className="text-sm font-medium text-slate-700"
                  >
                    수정 사유 *
                  </Label>
                  <Textarea
                    id="leave-edit-reason"
                    value={editReason}
                    onChange={(event) => setEditReason(event.target.value)}
                    placeholder="승인된 휴가의 수정 사유를 입력하세요"
                    rows={2}
                    maxLength={2000}
                  />
                </div>
              )}

              <DialogFooter>
                {isEditing && editingRecord && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => {
                      setDeleteTargetId(editingRecord.id);
                      handleOpenChange(false);
                    }}
                  >
                    삭제
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    loadingOptions ||
                    !startDate ||
                    !leaveTypeId ||
                    !approverId ||
                    (requiresEditReason && !editReason.trim())
                  }
                  className="gap-2"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isPending
                    ? isEditing
                      ? "저장 중..."
                      : "신청 중..."
                    : isEditing
                      ? "수정"
                      : "휴가 신청"}
                </Button>
              </DialogFooter>
            </section>
          </form>
        </DialogContent>
      </Dialog>
      <DayoffDeleteDialog
        open={!!deleteTargetId}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (!deleteTargetId) return;
          deleteRequest.mutate(deleteTargetId, {
            onSuccess: () => setDeleteTargetId(null),
          });
        }}
        isDeleting={deleteRequest.isPending}
      />
    </>
  );
}
