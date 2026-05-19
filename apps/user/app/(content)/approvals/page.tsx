"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  X,
  Clock,
  FileText,
  Send,
} from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import { toast } from "@repo/ui/src/sonner";
import { useUserStore } from "@/stores/userStore";
import {
  useApprovals,
  useMyRequests,
  useApproveRequest,
  useRejectRequest,
  type ApprovalRequest,
  type AttendanceModifyApprovalData,
  type DayoffApprovalData,
} from "@/hooks/use-approvals";
import dayjs from "dayjs";

type ViewMode = "inbox" | "sent";

const STATUS_BADGE: Record<string, { label: string; className: string; icon: typeof Check }> = {
  pending: { label: "대기", className: "bg-amber-50 text-amber-600", icon: Clock },
  approved: { label: "승인", className: "bg-emerald-50 text-emerald-600", icon: Check },
  rejected: { label: "반려", className: "bg-red-50 text-red-600", icon: X },
};
const DEFAULT_STATUS_BADGE = {
  label: "대기",
  className: "bg-amber-50 text-amber-600",
  icon: Clock,
};

export default function ApprovalsPage() {
  const { memberId } = useUserStore();
  const [viewMode, setViewMode] = useState<ViewMode>("inbox");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const {
    data: inboxItems,
    isLoading: inboxLoading,
  } = useApprovals(memberId || "", "pending");
  const {
    data: sentItems,
    isLoading: sentLoading,
  } = useMyRequests(memberId || "");

  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const handleApprove = (approvalId: string) => {
    if (!memberId) return;
    approveMutation.mutate(
      { approvalId, memberId },
      {
        onSuccess: () => toast.success("승인되었습니다."),
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  const openRejectDialog = (approvalId: string) => {
    const target = inboxItems?.find((item) => item.id === approvalId) || null;
    setRejectTarget(target);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (!rejectTarget || !memberId) return;
    rejectMutation.mutate(
      { approvalId: rejectTarget.id, memberId, rejectReason: rejectReason || undefined },
      {
        onSuccess: () => {
          toast.success("반려되었습니다.");
          setRejectDialogOpen(false);
          setRejectTarget(null);
        },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  const isLoading = viewMode === "inbox" ? inboxLoading : sentLoading;
  const items = viewMode === "inbox" ? inboxItems : sentItems;

  // 탭 토글
  const tabToggle = (
    <div className="flex gap-2">
      <button
        onClick={() => setViewMode("inbox")}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          viewMode === "inbox"
            ? "bg-slate-800 text-white"
            : "bg-gray-50 text-slate-400 hover:text-slate-600"
        }`}
      >
        <Clock size={14} />
        받은 요청
        {inboxItems && inboxItems.length > 0 && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            viewMode === "inbox"
              ? "bg-white/20 text-white"
              : "bg-amber-100 text-amber-700"
          }`}>
            {inboxItems.length}
          </span>
        )}
      </button>
      <button
        onClick={() => setViewMode("sent")}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          viewMode === "sent"
            ? "bg-slate-800 text-white"
            : "bg-gray-50 text-slate-400 hover:text-slate-600"
        }`}
      >
        <Send size={14} />
        보낸 요청
      </button>
    </div>
  );

  // 요청 리스트
  const listContent = isLoading ? (
    <div className="rounded-2xl bg-gray-50 p-5">
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white p-4">
            <div className="flex justify-between mb-2">
              <div className="bg-gray-100 rounded h-4 w-24" />
              <div className="bg-gray-100 rounded h-3 w-12" />
            </div>
            <div className="bg-gray-50 rounded h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  ) : !items || items.length === 0 ? (
    <div className="rounded-2xl bg-gray-50 p-5">
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <FileText className="mb-3 h-8 w-8" />
        <p className="text-sm">
          {viewMode === "inbox"
            ? "대기 중인 요청이 없습니다."
            : "보낸 요청이 없습니다."}
        </p>
      </div>
    </div>
  ) : (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <ApprovalCard
              item={item}
              viewMode={viewMode}
              onApprove={handleApprove}
              onReject={openRejectDialog}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );

  const isAttendanceModifyReject =
    rejectTarget?.related_table === "attendance_modification_requests";

  return (
    <React.Fragment>
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {tabToggle}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {listContent}
        </motion.div>
      </div>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(isOpen) => {
          setRejectDialogOpen(isOpen);
          if (!isOpen) setRejectTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>반려 사유</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={
              isAttendanceModifyReject
                ? "반려 사유를 입력해주세요"
                : "반려 사유를 입력해주세요 (선택)"
            }
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={
                rejectMutation.isPending ||
                (isAttendanceModifyReject && !rejectReason.trim())
              }
            >
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}

function isDayoffData(data: ApprovalRequest["related_data"]): data is DayoffApprovalData {
  return !!data && "leave_date" in data;
}

function isAttendanceModifyData(
  data: ApprovalRequest["related_data"],
): data is AttendanceModifyApprovalData {
  return !!data && "requested_type" in data;
}

function ApprovalCard({
  item,
  viewMode,
  onApprove,
  onReject,
}: {
  item: ApprovalRequest;
  viewMode: ViewMode;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const badge = STATUS_BADGE[item.status] || DEFAULT_STATUS_BADGE;
  const dayoff = isDayoffData(item.related_data) ? item.related_data : null;
  const modifyRequest = isAttendanceModifyData(item.related_data)
    ? item.related_data
    : null;
  const requestTitle = modifyRequest ? "근태 수정 요청" : dayoff?.leave_type?.name;

  return (
    <div className="rounded-xl bg-white p-4 transition-colors">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
            {requestTitle && (
              <span className="text-sm font-semibold text-slate-800">
                {requestTitle}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {dayjs(item.requested_at).format("MM/DD")}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-slate-600">
            {viewMode === "inbox"
              ? item.requester?.full_name || "알 수 없음"
              : `승인자: ${item.approver?.full_name || "알 수 없음"}`}
          </p>
          {dayoff && (
            <p className="text-sm font-medium text-slate-900">
              {dayjs(dayoff.leave_date).format("YYYY-MM-DD (ddd)")}
            </p>
          )}
          {dayoff?.reason && (
            <p className="text-xs text-slate-400">사유: {dayoff.reason}</p>
          )}
          {modifyRequest && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">
                {modifyRequest.attendance_record
                  ? dayjs(modifyRequest.attendance_record.date).format(
                      "YYYY-MM-DD (ddd)",
                    )
                  : "대상 날짜 없음"}
              </p>
              <p className="text-xs font-medium text-slate-600">
                {modifyRequest.original_type} → {modifyRequest.requested_type}
              </p>
              <p className="text-xs text-slate-400">
                사유: {modifyRequest.reason}
              </p>
            </div>
          )}
          {item.reject_reason && (
            <p className="text-xs text-red-500">
              반려 사유: {item.reject_reason}
            </p>
          )}
        </div>

        {viewMode === "inbox" && item.status === "pending" && (
          <div className="flex gap-2 pt-0.5">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1 text-emerald-600 hover:bg-emerald-50 border-emerald-200"
              onClick={() => onApprove(item.id)}
            >
              <Check className="h-3.5 w-3.5" />
              승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1 text-red-500 hover:bg-red-50 border-red-200"
              onClick={() => onReject(item.id)}
            >
              <X className="h-3.5 w-3.5" />
              반려
            </Button>
          </div>
        )}

        {item.status !== "pending" && item.resolved_at && (
          <p className="text-[11px] text-slate-400">
            처리: {dayjs(item.resolved_at).format("MM/DD HH:mm")}
          </p>
        )}
      </div>
    </div>
  );
}
