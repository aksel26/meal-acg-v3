"use client";

import { useState } from "react";
import Link from "next/link";
import { useDeleteWorker, useUpdateWorker } from "@/hooks/use-worker-mutations";
import { useAssignments } from "@/hooks/use-assignments";
import { toast } from "@repo/ui/src/sonner";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { Worker } from "@/lib/supabase/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/src/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/src/alert-dialog";

type WorkerRow = Worker & {
  assignments: { count: number }[];
  latest_assigned_at: string | null;
};


function AssignmentPopover({ workerId }: { workerId: string }) {
  const { data: assignments, isLoading } = useAssignments({ workerId });

  return (
    <PopoverContent align="start" className="w-60 p-3">
      <p className="mb-2 text-xs font-medium text-slate-500">참가 이력</p>
      {isLoading ? (
        <p className="text-xs text-slate-400">로딩 중...</p>
      ) : !assignments?.length ? (
        <p className="text-xs text-slate-400">참가 이력 없음</p>
      ) : (
        <ul className="space-y-1">
          {assignments.map((a, i) => (
            <li key={a.id} className="flex gap-1.5 text-xs text-slate-700">
              <span className="shrink-0 text-slate-400">{i + 1}.</span>
              {a.job_posting?.id ? (
                <Link
                  href={`/job-postings/${a.job_posting.id}`}
                  className="truncate text-blue-600 hover:underline"
                >
                  {a.job_posting.title ?? "-"}
                </Link>
              ) : (
                <span className="truncate">{a.job_posting?.title ?? "-"}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </PopoverContent>
  );
}

export default function WorkerTable({
  data,
  isLoading,
  onView,
  onEdit,
}: {
  data: WorkerRow[];
  isLoading: boolean;
  onView: (id: string) => void;
  onEdit?: (worker: WorkerRow) => void;
}) {
  const deleteMutation = useDeleteWorker();
  const updateMutation = useUpdateWorker();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteValue, setEditNoteValue] = useState("");

  const allSelected = data.length > 0 && selectedIds.size === data.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((w) => w.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selectedIds].map((id) => deleteMutation.mutateAsync(id)));
      toast.success(`${selectedIds.size}명의 지원자가 삭제되었습니다.`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
    setBulkDeleteOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("지원자가 삭제되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
    setDeleteTarget(null);
  };

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-slate-400">로딩 중...</div>;
  }

  if (!data.length) {
    return <div className="py-10 text-center text-sm text-slate-400">등록된 지원자가 없습니다.</div>;
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-1.5">
          <span className="text-sm text-slate-600">{selectedIds.size}명 선택</span>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
          >
            선택 삭제
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200"
          >
            선택 해제
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-sm">
        <table className="w-full table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={someSelected ? "indeterminate" : allSelected}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="w-[85px] px-3 py-2 font-medium">이름</th>
              <th className="w-[160px] px-3 py-2 font-medium">연락처</th>
              <th className="px-3 py-2 font-medium">이메일</th>
              <th className="w-[60px] px-3 py-2 font-medium text-center">경력</th>
              <th className="w-[200px] px-3 py-2 font-medium">메모</th>
              <th className="w-[80px] px-3 py-2 font-medium text-center">블랙리스트</th>
              <th className="px-3 py-2 font-medium text-center">최근 배정일</th>
              <th className="px-3 py-2 font-medium text-center">등록일</th>
              <th className="px-3 py-2 font-medium text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {data.map((worker) => {
              const assignCount = worker.assignments?.[0]?.count ?? 0;
              return (
                <tr key={worker.id} className="border-b border-slate-100 last:border-b-0 bg-white transition-colors hover:bg-slate-50">
                  <td className="w-10 px-3 py-3">
                    <Checkbox
                      checked={selectedIds.has(worker.id)}
                      onCheckedChange={() => toggleOne(worker.id)}
                    />
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800">{worker.name}</td>
                  <td className="px-3 py-3 tabular-nums text-slate-600">{worker.phone || "-"}</td>
                  <td className="px-3 py-3 text-slate-600">{worker.email || "-"}</td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {assignCount > 0 ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="rounded px-2 py-0.5 text-blue-600 underline-offset-2 hover:bg-blue-50 hover:underline">
                            {assignCount}
                          </button>
                        </PopoverTrigger>
                        <AssignmentPopover workerId={worker.id} />
                      </Popover>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="w-[200px] px-3 py-3">
                    {editingNoteId === worker.id ? (
                      <input
                        autoFocus
                        value={editNoteValue}
                        onChange={(e) => setEditNoteValue(e.target.value)}
                        onBlur={async () => {
                          if (editNoteValue !== (worker.note ?? "")) {
                            try {
                              await updateMutation.mutateAsync({ id: worker.id, note: editNoteValue });
                            } catch {
                              toast.error("메모 저장에 실패했습니다.");
                            }
                          }
                          setEditingNoteId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") setEditingNoteId(null);
                        }}
                        className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditingNoteId(worker.id);
                          setEditNoteValue(worker.note ?? "");
                        }}
                        className="w-full truncate rounded px-2 py-1 text-left text-slate-500 hover:bg-slate-100"
                      >
                        {worker.note || <span className="text-slate-300">메모 추가</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {worker.warning ? (
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        주의
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                    {worker.latest_assigned_at
                      ? worker.latest_assigned_at.slice(0, 10)
                      : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                    {worker.created_at.slice(0, 10)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onView(worker.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Eye size={15} />
                      </button>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(worker)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-500"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget({ id: worker.id, name: worker.name })}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; 지원자를 삭제하시겠습니까? 관련 배정 및 계약서도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일괄 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedIds.size}명의 지원자를 삭제하시겠습니까? 관련 배정 및 계약서도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
