"use client";

import { useState } from "react";
import { useJobPostings } from "@/hooks/use-job-postings";
import { useCreateAssignment } from "@/hooks/use-assignment-mutations";
import { toast } from "@repo/ui/src/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import { Loader2 } from "lucide-react";

export default function BulkAssignDialog({
  open,
  onClose,
  workerIds,
}: {
  open: boolean;
  onClose: () => void;
  workerIds: string[];
}) {
  const { data: jobPostings, isLoading } = useJobPostings("open");
  const createAssignment = useCreateAssignment();
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setSelectedPostingId(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedPostingId) return;
    setIsSubmitting(true);

    const results = await Promise.allSettled(
      workerIds.map((worker_id) =>
        createAssignment.mutateAsync({
          worker_id,
          job_posting_id: selectedPostingId,
        })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      toast.success(`${succeeded}명 배정 완료`);
    } else if (succeeded === 0) {
      toast.error(`배정 실패 (${failed}건 — 이미 배정된 인원일 수 있습니다)`);
    } else {
      toast.info(`${succeeded}명 배정 완료, ${failed}건 실패 (이미 배정된 인원)`);
    }

    setIsSubmitting(false);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>일괄 배정 — {workerIds.length}명</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            공고 목록 로딩 중...
          </div>
        ) : !jobPostings?.length ? (
          <div className="py-8 text-center text-sm text-slate-400">
            진행 중인 공고가 없습니다.
          </div>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {jobPostings.map((posting) => (
              <button
                key={posting.id}
                onClick={() => setSelectedPostingId(posting.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  selectedPostingId === posting.id
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                <div className="font-medium">{posting.title}</div>
                <div
                  className={`text-xs ${
                    selectedPostingId === posting.id ? "text-slate-300" : "text-slate-400"
                  }`}
                >
                  배정 {posting.assignments?.[0]?.count ?? 0}명
                </div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPostingId || isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                배정 중...
              </span>
            ) : (
              "배정"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
