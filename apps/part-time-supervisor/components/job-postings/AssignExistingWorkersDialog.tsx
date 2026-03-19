"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useWorkers } from "@/hooks/use-workers";
import { useCreateAssignment } from "@/hooks/use-assignment-mutations";
import { toast } from "@repo/ui/src/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Loader2 } from "lucide-react";
import type { AssignmentWithDetails } from "@/lib/supabase/types";

export default function AssignExistingWorkersDialog({
  open,
  onClose,
  jobPostingId,
  assignments,
}: {
  open: boolean;
  onClose: () => void;
  jobPostingId: string;
  assignments: AssignmentWithDetails[];
}) {
  const { data: workers, isLoading } = useWorkers();
  const createAssignment = useCreateAssignment();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const assignedWorkerIds = useMemo(
    () => new Set(assignments.map((a) => a.worker_id)),
    [assignments]
  );

  const filteredWorkers = useMemo(() => {
    if (!workers) return [];
    if (!search.trim()) return workers;
    const q = search.trim().toLowerCase();
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.phone && w.phone.includes(q))
    );
  }, [workers, search]);

  const toggleWorker = useCallback((workerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) {
        next.delete(workerId);
      } else {
        next.add(workerId);
      }
      return next;
    });
  }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        itemRefs.current[0]?.focus();
      }
    },
    []
  );

  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number, workerId: string, isAssigned: boolean) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        itemRefs.current[index + 1]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (index === 0) {
          inputRef.current?.focus();
        } else {
          itemRefs.current[index - 1]?.focus();
        }
      } else if ((e.key === "Enter" || e.key === " ") && !isAssigned) {
        e.preventDefault();
        toggleWorker(workerId);
      }
    },
    [toggleWorker]
  );

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearch("");
    onClose();
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);

    const results = await Promise.allSettled(
      Array.from(selectedIds).map((worker_id) =>
        createAssignment.mutateAsync({
          worker_id,
          job_posting_id: jobPostingId,
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
          <DialogTitle>기존 지원자 배정</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            지원자 목록 로딩 중...
          </div>
        ) : (
          <div className="rounded-lg border">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="이름 또는 전화번호로 검색..."
              className="w-full border-b bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400"
            />
            {selectedIds.size > 0 && (
              <div className="border-b px-3 py-1.5 text-xs text-slate-500">
                {selectedIds.size}명 선택됨
              </div>
            )}
            <div className="max-h-64 overflow-y-auto">
              {filteredWorkers.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">
                  검색 결과가 없습니다.
                </div>
              ) : (
                filteredWorkers.map((worker, index) => {
                  const isAssigned = assignedWorkerIds.has(worker.id);
                  const isSelected = selectedIds.has(worker.id);

                  return (
                    <div
                      key={worker.id}
                      ref={(el) => { itemRefs.current[index] = el; }}
                      role="button"
                      tabIndex={0}
                      className={`flex items-center gap-3 px-3 py-2 outline-none hover:bg-slate-50 focus:bg-slate-100 ${
                        isAssigned
                          ? "cursor-default opacity-50"
                          : "cursor-pointer"
                      }`}
                      onClick={() => {
                        if (!isAssigned) toggleWorker(worker.id);
                      }}
                      onKeyDown={(e) => handleItemKeyDown(e, index, worker.id, isAssigned)}
                    >
                      <Checkbox
                        checked={isAssigned || isSelected}
                        disabled={isAssigned}
                        tabIndex={-1}
                        className="pointer-events-none"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">
                          {worker.name}
                        </span>
                        {worker.phone && (
                          <span className="ml-2 text-xs text-slate-400">
                            {worker.phone}
                          </span>
                        )}
                      </div>
                      {isAssigned && (
                        <span className="shrink-0 text-xs text-slate-400">
                          배정됨
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
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
            disabled={selectedIds.size === 0 || isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                배정 중...
              </span>
            ) : selectedIds.size > 0 ? (
              `${selectedIds.size}명 배정`
            ) : (
              "배정"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
