"use client";

import { useState } from "react";
import { Check, X, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import {
  useApprovals,
  useApproveRequest,
  useRejectRequest,
  type ApprovalRequest,
} from "@/hooks/useApprovals";
import dayjs from "dayjs";

type TabStatus = "pending" | "approved" | "rejected";

const TABS: { key: TabStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "pending", label: "대기", icon: Clock },
  { key: "approved", label: "승인", icon: CheckCircle2 },
  { key: "rejected", label: "반려", icon: XCircle },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "대기", className: "bg-amber-100 text-amber-700" },
  approved: { label: "승인", className: "bg-green-100 text-green-700" },
  rejected: { label: "반려", className: "bg-red-100 text-red-700" },
};

const TYPE_LABEL: Record<string, string> = {
  leave: "휴가",
  overtime: "초과근무",
};

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<TabStatus>("pending");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: approvals, isLoading } = useApprovals(activeTab);
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id });
  };

  const openRejectDialog = (id: string) => {
    setRejectTarget(id);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    rejectMutation.mutate(
      { id: rejectTarget, rejectReason: rejectReason || undefined },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setRejectTarget(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">승인 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          휴가/초과근무 승인 요청을 관리합니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {approvals && activeTab === tab.key && (
              <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs">
                {approvals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-400">
          불러오는 중...
        </div>
      ) : !approvals || approvals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FileText className="mb-3 h-10 w-10" />
          <p className="text-sm">
            {activeTab === "pending"
              ? "대기 중인 요청이 없습니다."
              : activeTab === "approved"
                ? "승인된 요청이 없습니다."
                : "반려된 요청이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={handleApprove}
              onReject={openRejectDialog}
              showActions={activeTab === "pending"}
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
  approval,
  onApprove,
  onReject,
  showActions,
}: {
  approval: ApprovalRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  showActions: boolean;
}) {
  const badge = STATUS_BADGE[approval.status] ?? STATUS_BADGE["pending"]!;
  const dayoff = approval.related_data;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {TYPE_LABEL[approval.type] || approval.type}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              {approval.requester?.full_name || "알 수 없음"}
              {dayoff?.leave_type && (
                <span className="ml-2 font-normal text-slate-600">
                  {dayoff.leave_type.name}
                </span>
              )}
            </p>
            {dayoff && (
              <p className="text-sm text-slate-500">
                {dayjs(dayoff.leave_date).format("YYYY-MM-DD (ddd)")}
              </p>
            )}
            {dayoff?.reason && (
              <p className="text-xs text-slate-400">사유: {dayoff.reason}</p>
            )}
            {approval.reject_reason && (
              <p className="text-xs text-red-500">
                반려 사유: {approval.reject_reason}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>
              신청: {dayjs(approval.requested_at).format("MM/DD HH:mm")}
            </span>
            {approval.approver && (
              <span>승인자: {approval.approver.full_name}</span>
            )}
            {approval.resolved_at && (
              <span>
                처리: {dayjs(approval.resolved_at).format("MM/DD HH:mm")}
              </span>
            )}
          </div>
        </div>

        {showActions && (
          <div className="ml-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={() => onApprove(approval.id)}
            >
              <Check className="h-3.5 w-3.5" />
              승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => onReject(approval.id)}
            >
              <X className="h-3.5 w-3.5" />
              반려
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
