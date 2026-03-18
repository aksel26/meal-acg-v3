"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import { queryKeys } from "@/lib/query-keys";
import type { AssignmentWithDetails, JobPosting, Worker } from "@/lib/supabase/types";
import AssignedWorkersTable from "./AssignedWorkersTable";
import { useState } from "react";

type Props = {
  jobPostingId: string;
  jobPosting: JobPosting;
  assignments: AssignmentWithDetails[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onEditWorker?: (worker: Worker) => void;
};

export default function CandidateListPanel({
  jobPostingId,
  jobPosting,
  assignments,
  isLoading,
  selectedIds,
  onSelectedIdsChange,
  onEditWorker,
}: Props) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedIdsChange(next);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === assignments.length) {
      onSelectedIdsChange(new Set());
    } else {
      onSelectedIdsChange(new Set(assignments.map((a) => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`선택한 ${selectedIds.size}명을 명단에서 삭제하시겠습니까?`)) return;
    setIsDeleting(true);

    const results = await Promise.allSettled(
      Array.from(selectedIds).map((id) =>
        fetch(`/api/assignments/${id}`, { method: "DELETE" }).then((res) => {
          if (!res.ok) throw new Error(`삭제 실패: ${id}`);
        })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    queryClient.invalidateQueries({ queryKey: queryKeys.assignments.byJobPosting(jobPostingId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    onSelectedIdsChange(new Set());
    setIsDeleting(false);

    if (failed === 0) {
      toast.success(`${succeeded}명 삭제되었습니다.`);
    } else if (succeeded > 0) {
      toast.warning(`${succeeded}명 삭제 완료, ${failed}명 실패`);
    } else {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const isAllSelected = assignments.length > 0 && selectedIds.size === assignments.length;

  return (
    <div>
      {/* 액션 바 - 선택 시에만 표시 */}
      {selectedIds.size > 0 && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border bg-blue-50/50 px-4 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleToggleAll}
              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            전체선택
          </label>
          <span className="text-sm text-slate-500">{selectedIds.size}명 선택됨</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <AssignedWorkersTable
        jobPostingId={jobPostingId}
        job={jobPosting}
        assignments={assignments}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onToggle={handleToggle}
        onEditWorker={onEditWorker}
      />
    </div>
  );
}
