"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
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
} from "@/hooks/use-approvals";
import dayjs from "dayjs";

type ViewMode = "inbox" | "sent";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "대기", className: "bg-amber-100 text-amber-700" },
  approved: { label: "승인", className: "bg-green-100 text-green-700" },
  rejected: { label: "반려", className: "bg-red-100 text-red-700" },
};

export default function ApprovalsPage() {
  const router = useRouter();
  const { memberId } = useUserStore();
  const [viewMode, setViewMode] = useState<ViewMode>("inbox");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
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
    setRejectTarget(approvalId);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (!rejectTarget || !memberId) return;
    rejectMutation.mutate(
      { approvalId: rejectTarget, memberId, rejectReason: rejectReason || undefined },
      {
        onSuccess: () => {
          toast.success("반려되었습니다.");
          setRejectDialogOpen(false);
        },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  const isLoading = viewMode === "inbox" ? inboxLoading : sentLoading;
  const items = viewMode === "inbox" ? inboxItems : sentItems;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-xl p-2 transition-colors hover:bg-white/60"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">승인함</h1>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 rounded-xl bg-white/50 p-1">
        <button
          onClick={() => setViewMode("inbox")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            viewMode === "inbox"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          <Clock className="h-4 w-4" />
          받은 요청
          {inboxItems && inboxItems.length > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
              {inboxItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode("sent")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            viewMode === "sent"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          <Send className="h-4 w-4" />
          보낸 요청
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">
          불러오는 중...
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <FileText className="mb-3 h-8 w-8" />
          <p className="text-sm">
            {viewMode === "inbox"
              ? "대기 중인 요청이 없습니다."
              : "보낸 요청이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              viewMode={viewMode}
              onApprove={handleApprove}
              onReject={openRejectDialog}
            />
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>반려 사유</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="반려 사유를 입력해주세요 (선택)"
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
              disabled={rejectMutation.isPending}
            >
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
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
  const badge = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
  const dayoff = item.related_data;

  return (
    <div className="rounded-2xl bg-white/70 p-4 backdrop-blur-sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
            {dayoff?.leave_type && (
              <span className="text-sm font-medium text-slate-700">
                {dayoff.leave_type.name}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {dayjs(item.requested_at).format("MM/DD")}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-slate-600">
            {viewMode === "inbox"
              ? `${item.requester?.full_name || "알 수 없음"}`
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
          {item.reject_reason && (
            <p className="text-xs text-red-500">
              반려 사유: {item.reject_reason}
            </p>
          )}
        </div>

        {viewMode === "inbox" && item.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1 text-green-600 hover:bg-green-50"
              onClick={() => onApprove(item.id)}
            >
              <Check className="h-3.5 w-3.5" />
              승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1 text-red-600 hover:bg-red-50"
              onClick={() => onReject(item.id)}
            >
              <X className="h-3.5 w-3.5" />
              반려
            </Button>
          </div>
        )}

        {item.status !== "pending" && item.resolved_at && (
          <p className="text-xs text-slate-400">
            처리: {dayjs(item.resolved_at).format("MM/DD HH:mm")}
          </p>
        )}
      </div>
    </div>
  );
}
