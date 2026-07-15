"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Textarea } from "@repo/ui/src/textarea";
import { Label } from "@repo/ui/src/label";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import {
  useAttendanceModifyRequest,
  useAttendanceModifyRequestDetail,
} from "@/hooks/use-attendance-modify";

dayjs.locale("ko");

const ATTENDANCE_TYPES = ["휴가", "재택", "외근"] as const;

const TYPE_BADGE_STYLES: Record<string, string> = {
  근무: "bg-slate-100 text-slate-700",
  휴가: "bg-emerald-50 text-emerald-700",
  재택: "bg-amber-50 text-amber-700",
  외근: "bg-blue-50 text-blue-700",
};

const MAX_REASON_LENGTH = 300;
const APPROVER_ROLES = new Set(["대표", "본부장", "팀장", "파트장"]);

interface AttendanceRecord {
  id: string;
  date: string;
  attendance_type: string;
}

interface AttendanceModifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
  memberId: string;
}

interface MemberOption {
  id: string;
  full_name: string;
  member_role: string | null;
  team_name: string | null;
}

export default function AttendanceModifyDialog({
  open,
  onOpenChange,
  record,
  memberId,
}: AttendanceModifyDialogProps) {
  const [requestedType, setRequestedType] = useState<string>("");
  const [approverId, setApproverId] = useState("");
  const [reason, setReason] = useState("");

  const modifyMutation = useAttendanceModifyRequest();
  const { data: modifyRequestDetail } =
    useAttendanceModifyRequestDetail(memberId, record?.id || null, open);
  const { data: members = [] } = useQuery<MemberOption[]>({
    queryKey: ["attendance-modify-approvers", memberId],
    queryFn: async () => {
      const params = new URLSearchParams({ member_id: memberId });
      const res = await fetch(`/api/points/members?${params}`);
      if (!res.ok) throw new Error("결재자 목록 조회 실패");
      return res.json();
    },
    enabled: open && !!memberId,
  });

  const approverOptions = useMemo(
    () =>
      members.filter(
        (member) =>
          member.id !== memberId &&
          !!member.member_role &&
          APPROVER_ROLES.has(member.member_role),
      ),
    [memberId, members],
  );

  const selectedApprover = approverOptions.find((m) => m.id === approverId);
  const isPendingExistingRequest =
    !!modifyRequestDetail &&
    (modifyRequestDetail.approval_status === "미승인" ||
      modifyRequestDetail.approval_status === "가승인");

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (!open || !record) return;
    setRequestedType("");
    setApproverId("");
    setReason("");
  }, [open, record?.id]);

  useEffect(() => {
    if (!open) return;
    if (approverOptions.length === 0) return;
    if (approverId && !approverOptions.some((member) => member.id === approverId)) {
      setApproverId("");
    }
  }, [approverId, approverOptions, open]);

  useEffect(() => {
    if (!open || !record || !modifyRequestDetail) return;
    setRequestedType(
      ATTENDANCE_TYPES.includes(
        modifyRequestDetail.requested_type as (typeof ATTENDANCE_TYPES)[number],
      )
        ? modifyRequestDetail.requested_type
        : "",
    );
    setApproverId(modifyRequestDetail.first_approver_id || "");
    setReason(
      modifyRequestDetail.requested_type === "근무"
        ? ""
        : modifyRequestDetail.reason || "",
    );
  }, [modifyRequestDetail, open, record]);

  const handleSubmit = () => {
    if (
      !record ||
      !requestedType ||
      !approverId ||
      !reason.trim() ||
      isPendingExistingRequest
    ) {
      return;
    }

    modifyMutation.mutate(
      {
        attendanceRecordId: record.id,
        requesterId: memberId,
        approverId,
        originalType: record.attendance_type,
        requestedType,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!record) return null;

  const d = dayjs(record.date);
  const dateLabel = `${d.format("M월 D일")} (${d.format("dd")})`;
  const isValid =
    !!requestedType &&
    requestedType !== record.attendance_type &&
    !!approverId &&
    reason.trim().length > 0;
  const reasonLength = reason.trim().length;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-none sm:max-w-md">
        <DialogHeader className="px-5 pb-4 pt-5 text-left">
          <DialogTitle className="text-lg font-semibold text-[#111111]">
            근태 수정 요청
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-5 text-slate-500">
            선택한 날짜의 근태 유형 변경을 결재자에게 요청합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 pb-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-center">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">대상 날짜</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {dateLabel}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">현재 유형</p>
              <span
                className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                  TYPE_BADGE_STYLES[record.attendance_type] ||
                  TYPE_BADGE_STYLES["근무"]
                }`}
              >
                {record.attendance_type}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              변경할 근태 유형
            </Label>
            <div className="flex gap-2">
              {ATTENDANCE_TYPES.filter(
                (t) => t !== record.attendance_type
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRequestedType(type)}
                  aria-pressed={requestedType === type}
                  className={`min-h-10 flex-1 cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                    requestedType === type
                      ? "bg-[#111111] text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              결재자
            </Label>
            <SearchableDropdown
              items={approverOptions}
              getItemKey={(member) => member.id}
              getItemLabel={(member) =>
                `${member.full_name}${member.member_role ? ` · ${member.member_role}` : ""}`
              }
              onSelect={(member) => setApproverId(member.id)}
              placeholder="결재자 선택"
              searchPlaceholder="이름 검색"
              className="w-full"
            />
            {selectedApprover && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">
                  {selectedApprover.full_name}
                </span>
                <span className="text-xs text-slate-400">
                  {selectedApprover.member_role || "결재자"}
                </span>
              </div>
            )}
            {modifyRequestDetail && (
              <p className="text-xs leading-5 text-slate-400">
                기존 요청 상태: {modifyRequestDetail.approval_status}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="reason"
              className="flex items-center justify-between text-sm font-medium text-slate-700"
            >
              <span>수정 사유</span>
              <span className="text-xs font-normal text-slate-400">
                {reasonLength}/{MAX_REASON_LENGTH}
              </span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) =>
                setReason(e.target.value.slice(0, MAX_REASON_LENGTH))
              }
              placeholder="예: 오전 외근으로 근태 유형 변경 요청합니다."
              className="min-h-24 resize-none rounded-xl bg-slate-50 text-sm focus:bg-white"
            />
            <p className="text-xs leading-5 text-slate-400">
              결재자가 확인할 수 있도록 변경 사유를 간단히 남겨주세요.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="flex-1 cursor-pointer border-0 bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              취소
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isPendingExistingRequest || modifyMutation.isPending}
            className="flex-1 cursor-pointer bg-[#111111] text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPendingExistingRequest
              ? "요청 진행 중"
              : modifyMutation.isPending
                ? "제출 중..."
                : "수정 요청"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
