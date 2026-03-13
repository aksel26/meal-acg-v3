"use client";

import { useState } from "react";
import { useJobPostings } from "@/hooks/use-job-postings";
import { useWorkers } from "@/hooks/use-workers";
import { useCreateAssignment } from "@/hooks/use-assignment-mutations";
import { toast } from "@repo/ui/src/sonner";

export default function AssignmentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [jobPostingId, setJobPostingId] = useState("");
  const [workerId, setWorkerId] = useState("");
  const { data: jobPostings } = useJobPostings();
  const { data: workers } = useWorkers();
  const createMutation = useCreateAssignment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobPostingId || !workerId) {
      toast.error("공고와 지원자를 선택하세요.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        job_posting_id: jobPostingId,
        worker_id: workerId,
      });
      toast.success("배정이 완료되었습니다.");
      setJobPostingId("");
      setWorkerId("");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "배정에 실패했습니다.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">배정 등록</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">공고 선택 *</label>
            <select
              value={jobPostingId}
              onChange={(e) => setJobPostingId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">공고를 선택하세요</option>
              {jobPostings?.map((jp) => (
                <option key={jp.id} value={jp.id}>
                  {jp.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">지원자 선택 *</label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">지원자를 선택하세요</option>
              {workers?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.phone || "연락처 없음"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {createMutation.isPending ? "배정 중..." : "배정"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
