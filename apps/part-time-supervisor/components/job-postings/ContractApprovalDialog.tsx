"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import ContractPreview from "@/components/contract/ContractPreview";
import type { AssignmentWithDetails, JobPosting } from "@/lib/supabase/types";
import dayjs from "dayjs";

export default function ContractApprovalDialog({
  assignment,
  job,
  open,
  onOpenChange,
  onConfirmed,
}: {
  assignment: AssignmentWithDetails | null;
  job: JobPosting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}) {
  const queryClient = useQueryClient();
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureLoading, setSignatureLoading] = useState(true);

  useEffect(() => {
    if (!open || !assignment) return;
    setSignatureLoading(true);
    setSignatureUrl(null);
    fetch(`/api/assignments/${assignment.id}/signature`)
      .then((res) => res.json())
      .then((data) => {
        if (data.signedUrl) setSignatureUrl(data.signedUrl);
      })
      .catch(() => {})
      .finally(() => setSignatureLoading(false));
  }, [open, assignment]);

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!assignment) throw new Error("No assignment");
      const res = await fetch(`/api/assignments/${assignment.id}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reject");
      }
      return res.json();
    },
    onSuccess: () => {
      if (!assignment) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.byJobPosting(assignment.job_posting_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("계약이 반려되었습니다. 재서명이 필요합니다.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("반려에 실패했습니다.");
    },
  });

  const handleReject = () => {
    if (!window.confirm("계약을 반려하시겠습니까? 서명이 초기화되며 재서명이 필요합니다.")) return;
    rejectMutation.mutate();
  };

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!assignment) throw new Error("No assignment");
      const res = await fetch(`/api/assignments/${assignment.id}/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to confirm");
      }
      return res.json();
    },
    onSuccess: () => {
      if (!assignment) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.byJobPosting(assignment.job_posting_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("계약이 승인되었습니다.");
      onConfirmed();
    },
    onError: () => {
      toast.error("승인에 실패했습니다.");
    },
  });

  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>계약 승인</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <ContractPreview job={job} workerName={assignment.worker?.name || ""} />

          {/* Signature */}
          <div className="rounded-xl border p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">서명</h4>
            {signatureLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : signatureUrl ? (
              <div className="flex justify-center rounded-lg border bg-slate-50 p-3">
                <img
                  src={signatureUrl}
                  alt="서명 이미지"
                  className="max-h-32 object-contain"
                />
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-slate-400">
                서명 이미지를 불러올 수 없습니다.
              </div>
            )}
            {assignment.signed_at && (
              <p className="mt-2 text-right text-xs text-slate-400">
                서명일: {dayjs(assignment.signed_at).format("YYYY.MM.DD HH:mm")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <button
            onClick={handleReject}
            disabled={rejectMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {rejectMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            반려
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {confirmMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              최종 승인
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
