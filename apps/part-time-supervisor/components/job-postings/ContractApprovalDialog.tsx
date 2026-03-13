"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";
import { X, Loader2 } from "lucide-react";
import ContractPreview from "@/components/contract/ContractPreview";
import type { AssignmentWithDetails, JobPosting } from "@/lib/supabase/types";
import dayjs from "dayjs";

export default function ContractApprovalDialog({
  assignment,
  job,
  onClose,
  onConfirmed,
}: {
  assignment: AssignmentWithDetails;
  job: JobPosting;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const queryClient = useQueryClient();
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureLoading, setSignatureLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assignments/${assignment.id}/signature`)
      .then((res) => res.json())
      .then((data) => {
        if (data.signedUrl) setSignatureUrl(data.signedUrl);
      })
      .catch(() => {})
      .finally(() => setSignatureLoading(false));
  }, [assignment.id]);

  const rejectMutation = useMutation({
    mutationFn: async () => {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.byJobPosting(assignment.job_posting_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("계약이 반려되었습니다. 재서명이 필요합니다.");
      onClose();
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.byJobPosting(assignment.job_posting_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("계약이 승인되었습니다.");
      onConfirmed();
    },
    onError: () => {
      toast.error("승인에 실패했습니다.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-semibold">계약 승인</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-5 py-4">
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
              onClick={onClose}
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
        </div>
      </div>
    </div>
  );
}
