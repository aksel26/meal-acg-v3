"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  ListChecks,
  TimerReset,
  Undo2,
  X,
  XCircle,
} from "lucide-react";
import dayjs from "dayjs";
import { Button } from "@repo/ui/src/button";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  useApprovals,
  useApproveRequest,
  useCancelApprovalRequest,
  useRejectRequest,
  type ApprovalRequest,
} from "@/hooks/useApprovals";
import {
  useEarlyLeaveRequests,
  useUpdateEarlyLeaveStatus,
  type EarlyLeaveRequest,
} from "@/hooks/useEarlyLeaveRequests";

type TabStatus = "all" | "pending" | "approved" | "rejected";
type Category = "leave" | "early_leave";

const TABS: { key: TabStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all", label: "전체", icon: FileText },
  { key: "pending", label: "대기", icon: Clock },
  { key: "approved", label: "승인", icon: CheckCircle2 },
  { key: "rejected", label: "반려", icon: XCircle },
];

const CATEGORY_TABS: { key: Category; label: string; description: string }[] = [
  { key: "leave", label: "휴가/초과근무", description: "일반 승인 요청" },
  { key: "early_leave", label: "조기퇴근", description: "가승인 후 최종승인" },
];

const STATUS_BADGE: Record<string, { label: string; className: string; dotClassName: string }> = {
  pending: {
    label: "대기",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dotClassName: "bg-amber-500",
  },
  approved: {
    label: "승인",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
  },
  rejected: {
    label: "반려",
    className: "border-red-200 bg-red-50 text-red-700",
    dotClassName: "bg-red-500",
  },
  pre_approved: {
    label: "가승인",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    dotClassName: "bg-blue-500",
  },
};

const TYPE_LABEL: Record<string, string> = {
  leave: "휴가",
  overtime: "초과근무",
};

export default function ApprovalsPage() {
  const [category, setCategory] = useState<Category>("leave");
  const [activeTab, setActiveTab] = useState<TabStatus>("pending");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; category: Category } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: approvals, isLoading } = useApprovals(activeTab === "all" ? undefined : activeTab);
  const approveMutation = useApproveRequest();
  const cancelApprovalMutation = useCancelApprovalRequest();
  const rejectMutation = useRejectRequest();

  const { data: earlyLeaveRequests, isLoading: elLoading } = useEarlyLeaveRequests();
  const earlyLeaveMutation = useUpdateEarlyLeaveStatus();

  const filteredEarlyLeave = useMemo(() => {
    return (earlyLeaveRequests || []).filter((request) => {
      if (activeTab === "all") return true;
      if (activeTab === "pending") {
        return request.approval_status === "pending" || request.approval_status === "pre_approved";
      }
      if (activeTab === "approved") return request.approval_status === "approved";
      return request.approval_status === "rejected";
    });
  }, [activeTab, earlyLeaveRequests]);

  const earlyLeaveSummary = useMemo(() => {
    const requests = earlyLeaveRequests || [];
    return {
      pending: requests.filter((request) => request.approval_status === "pending").length,
      preApproved: requests.filter((request) => request.approval_status === "pre_approved").length,
      approved: requests.filter((request) => request.approval_status === "approved").length,
      rejected: requests.filter((request) => request.approval_status === "rejected").length,
    };
  }, [earlyLeaveRequests]);

  const currentItems = category === "leave" ? approvals || [] : filteredEarlyLeave;
  const isCurrentLoading = category === "leave" ? isLoading : elLoading;
  const pendingWorkCount =
    category === "leave" ? currentItems.length : earlyLeaveSummary.pending + earlyLeaveSummary.preApproved;

  const openRejectDialog = (id: string, targetCategory: Category) => {
    setRejectTarget({ id, category: targetCategory });
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (!rejectTarget) return;

    const onSuccess = () => {
      setRejectDialogOpen(false);
      setRejectTarget(null);
    };

    if (rejectTarget.category === "early_leave") {
      earlyLeaveMutation.mutate(
        { id: rejectTarget.id, action: "reject", rejectReason: rejectReason || undefined },
        { onSuccess }
      );
      return;
    }

    rejectMutation.mutate(
      { id: rejectTarget.id, rejectReason: rejectReason || undefined },
      { onSuccess }
    );
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">승인 관리</h1>
            <p className="mt-1 text-sm text-slate-500">
              대기 건을 우선 처리하고 완료/반려 이력을 확인합니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex">
            <SummaryPill label="현재 목록" value={currentItems.length} />
            <SummaryPill label="처리 대기" value={pendingWorkCount} tone="amber" />
            <SummaryPill
              label="가승인"
              value={category === "early_leave" ? earlyLeaveSummary.preApproved : 0}
              tone="blue"
            />
          </div>
        </div>

        <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div className="grid grid-cols-4 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                  activeTab === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
            {CATEGORY_TABS.map((tab) => {
              const isSelected = category === tab.key;
              const count =
                tab.key === "leave"
                  ? category === "leave"
                    ? currentItems.length
                    : undefined
                  : earlyLeaveSummary.pending + earlyLeaveSummary.preApproved;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCategory(tab.key)}
                  className={`flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                    isSelected
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof count === "number" && count > 0 && (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                        isSelected ? "bg-white text-slate-900" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {category === "leave" ? (
              <ListChecks className="h-4 w-4 text-slate-500" />
            ) : (
              <TimerReset className="h-4 w-4 text-slate-500" />
            )}
            {CATEGORY_TABS.find((tab) => tab.key === category)?.label} ·{" "}
            {TABS.find((tab) => tab.key === activeTab)?.label}
          </div>
          <span className="text-xs text-slate-400">총 {currentItems.length}건</span>
        </div>

        {isCurrentLoading ? (
          <LoadingState />
        ) : currentItems.length === 0 ? (
          <EmptyState activeTab={activeTab} />
        ) : category === "leave" ? (
          <ApprovalsTable
            approvals={approvals || []}
            activeTab={activeTab}
            showActions={activeTab === "pending"}
            cancelActionLabel={
              activeTab === "approved" ? "승인 취소" : activeTab === "rejected" ? "반려 취소" : null
            }
            onApprove={(id) => approveMutation.mutate({ id })}
            onCancel={(id) => cancelApprovalMutation.mutate({ id })}
            onReject={(id) => openRejectDialog(id, "leave")}
            isPending={approveMutation.isPending || rejectMutation.isPending || cancelApprovalMutation.isPending}
          />
        ) : (
          <EarlyLeaveTable
            requests={filteredEarlyLeave}
            onAction={(id, action) => earlyLeaveMutation.mutate({ id, action })}
            onReject={(id) => openRejectDialog(id, "early_leave")}
            isPending={earlyLeaveMutation.isPending}
          />
        )}
      </section>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>반려 사유</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="반려 사유를 입력해주세요 (선택)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || earlyLeaveMutation.isPending}
            >
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "amber" | "blue";
}) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-900",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];

  return (
    <div className={`rounded-lg px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-medium text-current opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-bold leading-none">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 text-sm text-slate-400">
      불러오는 중...
    </div>
  );
}

function EmptyState({ activeTab }: { activeTab: TabStatus }) {
  const message =
    activeTab === "pending"
      ? "대기 중인 요청이 없습니다."
      : activeTab === "approved"
        ? "승인된 요청이 없습니다."
        : "반려된 요청이 없습니다.";

  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <FileText className="mb-3 h-10 w-10" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ApprovalsTable({
  approvals,
  activeTab,
  showActions,
  cancelActionLabel,
  onApprove,
  onCancel,
  onReject,
  isPending,
}: {
  approvals: ApprovalRequest[];
  activeTab: TabStatus;
  showActions: boolean;
  cancelActionLabel: string | null;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-2.5">상태</th>
              <th className="px-4 py-2.5">요청자</th>
              <th className="px-4 py-2.5">유형</th>
              <th className="px-4 py-2.5">날짜</th>
              <th className="px-4 py-2.5">사유</th>
              <th className="px-4 py-2.5">승인자</th>
              <th className="px-4 py-2.5">신청/처리</th>
              <th className="w-32 px-4 py-2.5 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {approvals.map((approval) => {
              const rowActions = getApprovalRowActions(approval, activeTab, showActions, cancelActionLabel);

              return (
                <ApprovalRow
                  key={approval.id}
                  approval={approval}
                  showActions={rowActions.showActions}
                  cancelActionLabel={rowActions.cancelActionLabel}
                  onApprove={onApprove}
                  onCancel={onCancel}
                  onReject={onReject}
                  isPending={isPending}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 lg:hidden">
        {approvals.map((approval) => {
          const rowActions = getApprovalRowActions(approval, activeTab, showActions, cancelActionLabel);

          return (
            <ApprovalMobileCard
              key={approval.id}
              approval={approval}
              showActions={rowActions.showActions}
              cancelActionLabel={rowActions.cancelActionLabel}
              onApprove={onApprove}
              onCancel={onCancel}
              onReject={onReject}
              isPending={isPending}
            />
          );
        })}
      </div>
    </>
  );
}

function getApprovalRowActions(
  approval: ApprovalRequest,
  activeTab: TabStatus,
  showActions: boolean,
  cancelActionLabel: string | null
) {
  if (activeTab !== "all") {
    return { showActions, cancelActionLabel };
  }

  return {
    showActions: approval.status === "pending",
    cancelActionLabel:
      approval.status === "approved"
        ? "승인 취소"
        : approval.status === "rejected"
          ? "반려 취소"
          : null,
  };
}

function ApprovalRow({
  approval,
  showActions,
  cancelActionLabel,
  onApprove,
  onCancel,
  onReject,
  isPending,
}: {
  approval: ApprovalRequest;
  showActions: boolean;
  cancelActionLabel: string | null;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) {
  const dayoff = approval.related_data;

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <StatusBadge status={approval.status} />
      </td>
      <td className="px-4 py-3 font-medium text-slate-900">
        {approval.requester?.full_name || "알 수 없음"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
            {TYPE_LABEL[approval.type] || approval.type}
          </span>
          {dayoff?.leave_type && <span className="text-xs text-slate-500">{dayoff.leave_type.name}</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-700">
        {dayoff?.leave_date ? formatDate(dayoff.leave_date) : "-"}
      </td>
      <td className="max-w-[240px] px-4 py-3 text-slate-600">
        <p className="truncate text-xs">{approval.reject_reason || dayoff?.reason || "-"}</p>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {approval.approver?.full_name || "-"}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        <div>{dayjs(approval.requested_at).format("MM/DD HH:mm")}</div>
        {approval.resolved_at && (
          <div className="mt-0.5 text-slate-400">{dayjs(approval.resolved_at).format("MM/DD HH:mm")}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <ApprovalActions
          showActions={showActions}
          cancelActionLabel={cancelActionLabel}
          isPending={isPending}
          onApprove={() => onApprove(approval.id)}
          onCancel={() => onCancel(approval.id)}
          onReject={() => onReject(approval.id)}
        />
      </td>
    </tr>
  );
}

function ApprovalMobileCard({
  approval,
  showActions,
  cancelActionLabel,
  onApprove,
  onCancel,
  onReject,
  isPending,
}: {
  approval: ApprovalRequest;
  showActions: boolean;
  cancelActionLabel: string | null;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) {
  const dayoff = approval.related_data;

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{approval.requester?.full_name || "알 수 없음"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {TYPE_LABEL[approval.type] || approval.type}
            {dayoff?.leave_type ? ` · ${dayoff.leave_type.name}` : ""}
          </p>
        </div>
        <StatusBadge status={approval.status} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <InfoItem label="날짜" value={dayoff?.leave_date ? formatDate(dayoff.leave_date) : "-"} />
        <InfoItem label="승인자" value={approval.approver?.full_name || "-"} />
        <InfoItem label="신청" value={dayjs(approval.requested_at).format("MM/DD HH:mm")} />
        <InfoItem label="처리" value={approval.resolved_at ? dayjs(approval.resolved_at).format("MM/DD HH:mm") : "-"} />
      </dl>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {approval.reject_reason || dayoff?.reason || "사유 없음"}
      </p>
      <ApprovalActions
        showActions={showActions}
        cancelActionLabel={cancelActionLabel}
        isPending={isPending}
        onApprove={() => onApprove(approval.id)}
        onCancel={() => onCancel(approval.id)}
        onReject={() => onReject(approval.id)}
      />
    </div>
  );
}

function EarlyLeaveTable({
  requests,
  onAction,
  onReject,
  isPending,
}: {
  requests: EarlyLeaveRequest[];
  onAction: (id: string, action: "pre_approve" | "approve" | "revert") => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-2.5">상태</th>
              <th className="px-4 py-2.5">요청자</th>
              <th className="px-4 py-2.5">근무일</th>
              <th className="px-4 py-2.5">출퇴근</th>
              <th className="px-4 py-2.5">사유</th>
              <th className="px-4 py-2.5">승인 이력</th>
              <th className="px-4 py-2.5">신청</th>
              <th className="w-56 px-4 py-2.5 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((request) => (
              <EarlyLeaveRow
                key={request.id}
                request={request}
                onAction={onAction}
                onReject={onReject}
                isPending={isPending}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 lg:hidden">
        {requests.map((request) => (
          <EarlyLeaveMobileCard
            key={request.id}
            request={request}
            onAction={onAction}
            onReject={onReject}
            isPending={isPending}
          />
        ))}
      </div>
    </>
  );
}

function EarlyLeaveRow({
  request,
  onAction,
  onReject,
  isPending,
}: {
  request: EarlyLeaveRequest;
  onAction: (id: string, action: "pre_approve" | "approve" | "revert") => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) {
  const record = request.attendance_record;

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <StatusBadge status={request.approval_status} />
      </td>
      <td className="px-4 py-3 font-medium text-slate-900">
        {request.requester?.full_name || "알 수 없음"}
      </td>
      <td className="px-4 py-3 text-slate-700">{record?.date ? formatDate(record.date) : "-"}</td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {formatTime(record?.check_in_at || null)} 출근 → {formatTime(record?.check_out_at || null)} 퇴근
      </td>
      <td className="max-w-[260px] px-4 py-3 text-slate-600">
        <p className="truncate text-xs">{request.reject_reason || request.reason || "-"}</p>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        <ApprovalHistory request={request} />
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {dayjs(request.created_at).format("MM/DD HH:mm")}
      </td>
      <td className="px-4 py-3">
        <EarlyLeaveActions request={request} onAction={onAction} onReject={onReject} isPending={isPending} />
      </td>
    </tr>
  );
}

function EarlyLeaveMobileCard({
  request,
  onAction,
  onReject,
  isPending,
}: {
  request: EarlyLeaveRequest;
  onAction: (id: string, action: "pre_approve" | "approve" | "revert") => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) {
  const record = request.attendance_record;

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{request.requester?.full_name || "알 수 없음"}</p>
          <p className="mt-1 text-sm text-slate-500">{record?.date ? formatDate(record.date) : "-"}</p>
        </div>
        <StatusBadge status={request.approval_status} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <InfoItem label="출근" value={formatTime(record?.check_in_at || null)} />
        <InfoItem label="퇴근" value={formatTime(record?.check_out_at || null)} />
        <InfoItem label="신청" value={dayjs(request.created_at).format("MM/DD HH:mm")} />
        <InfoItem label="이력" value={approvalHistoryText(request)} />
      </dl>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {request.reject_reason || request.reason || "사유 없음"}
      </p>
      <EarlyLeaveActions request={request} onAction={onAction} onReject={onReject} isPending={isPending} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending!;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClassName}`} />
      {badge.label}
    </span>
  );
}

function ApprovalActions({
  showActions,
  cancelActionLabel,
  onApprove,
  onCancel,
  onReject,
  isPending,
}: {
  showActions: boolean;
  cancelActionLabel: string | null;
  onApprove: () => void;
  onCancel: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  if (cancelActionLabel) {
    return (
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
          onClick={onCancel}
          disabled={isPending}
        >
          <Undo2 className="h-3.5 w-3.5" />
          {cancelActionLabel}
        </Button>
      </div>
    );
  }

  if (!showActions) return <div className="text-right text-xs text-slate-400">처리 완료</div>;

  return (
    <div className="flex justify-end gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
        onClick={onApprove}
        disabled={isPending}
      >
        <Check className="h-3.5 w-3.5" />
        승인
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={onReject}
        disabled={isPending}
      >
        <X className="h-3.5 w-3.5" />
        반려
      </Button>
    </div>
  );
}

function EarlyLeaveActions({
  request,
  onAction,
  onReject,
  isPending,
}: {
  request: EarlyLeaveRequest;
  onAction: (id: string, action: "pre_approve" | "approve" | "revert") => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {request.approval_status === "pending" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-slate-800 hover:bg-slate-100"
            onClick={() => onAction(request.id, "pre_approve")}
            disabled={isPending}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            가승인
          </Button>
          <RejectButton onClick={() => onReject(request.id)} disabled={isPending} />
        </>
      )}
      {request.approval_status === "pre_approved" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            onClick={() => onAction(request.id, "approve")}
            disabled={isPending}
          >
            <Check className="h-3.5 w-3.5" />
            최종승인
          </Button>
          <RevertButton label="가승인 취소" onClick={() => onAction(request.id, "revert")} disabled={isPending} />
          <RejectButton onClick={() => onReject(request.id)} disabled={isPending} />
        </>
      )}
      {request.approval_status === "approved" && (
        <RevertButton label="승인 취소" onClick={() => onAction(request.id, "revert")} disabled={isPending} />
      )}
      {request.approval_status === "rejected" && (
        <RevertButton label="반려 취소" onClick={() => onAction(request.id, "revert")} disabled={isPending} />
      )}
    </div>
  );
}

function RejectButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
      onClick={onClick}
      disabled={disabled}
    >
      <X className="h-3.5 w-3.5" />
      반려
    </Button>
  );
}

function RevertButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 gap-1 text-slate-500 hover:bg-slate-50"
      onClick={onClick}
      disabled={disabled}
    >
      <Undo2 className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

function ApprovalHistory({ request }: { request: EarlyLeaveRequest }) {
  const text = approvalHistoryText(request);
  return <span>{text}</span>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-700">{value}</dd>
    </div>
  );
}

function approvalHistoryText(request: EarlyLeaveRequest) {
  const history = [];
  if (request.first_approver) history.push(`가승인 ${request.first_approver.full_name}`);
  if (request.final_approver) history.push(`최종승인 ${request.final_approver.full_name}`);
  return history.length > 0 ? history.join(" / ") : "-";
}

function formatDate(date: string) {
  return dayjs(date).format("YYYY-MM-DD (ddd)");
}

function formatTime(iso: string | null) {
  return iso ? dayjs(iso).format("HH:mm") : "-";
}
