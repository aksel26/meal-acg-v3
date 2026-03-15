"use client";

import { useState } from "react";
import { useDeleteWorker } from "@/hooks/use-worker-mutations";
import { useUpdateAssignment, useDeleteAssignment } from "@/hooks/use-assignment-mutations";
import { useAssignments } from "@/hooks/use-assignments";
import { toast } from "@repo/ui/src/sonner";
import { Eye, Trash2, X } from "lucide-react";
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
};

const statusLabel: Record<string, { text: string; className: string }> = {
  registered: { text: "등록", className: "bg-slate-100 text-slate-600" },
  contracted: { text: "계약", className: "bg-blue-100 text-blue-700" },
  working: { text: "근무중", className: "bg-green-100 text-green-700" },
  completed: { text: "완료", className: "bg-amber-100 text-amber-700" },
};

const assignmentStatusLabel: Record<string, { text: string; className: string }> = {
  assigned: { text: "배정", className: "bg-blue-100 text-blue-700" },
  working: { text: "근무중", className: "bg-green-100 text-green-700" },
  completed: { text: "완료", className: "bg-amber-100 text-amber-700" },
  cancelled: { text: "취소", className: "bg-red-100 text-red-600" },
};

const assignmentStatusOptions = [
  { value: "assigned", label: "배정" },
  { value: "working", label: "근무중" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

function AssignmentPopover({ workerId }: { workerId: string }) {
  const { data: assignments, isLoading } = useAssignments({ workerId });
  const updateMutation = useUpdateAssignment();
  const deleteMutation = useDeleteAssignment();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateMutation.mutateAsync({ id, status });
      toast.success("배정 상태가 변경되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success("배정이 해제되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "해제에 실패했습니다.");
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <PopoverContent align="start" className="w-72 p-3">
        <p className="mb-2 text-xs font-medium text-slate-500">배정된 공고</p>
        {isLoading ? (
          <p className="text-xs text-slate-400">로딩 중...</p>
        ) : !assignments?.length ? (
          <p className="text-xs text-slate-400">배정 내역 없음</p>
        ) : (
          <ul className="space-y-1.5">
            {assignments.map((a) => {
              const badge = assignmentStatusLabel[a.status] ?? assignmentStatusLabel.assigned!;
              return (
                <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">{a.job_posting?.title ?? "-"}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <select
                      value={a.status}
                      onChange={(e) => handleStatusChange(a.id, e.target.value)}
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {assignmentStatusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setDeleteTarget(a.id)}
                      className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>배정 해제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              배정을 해제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              해제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function WorkerTable({
  data,
  isLoading,
  onView,
}: {
  data: WorkerRow[];
  isLoading: boolean;
  onView: (id: string) => void;
}) {
  const deleteMutation = useDeleteWorker();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">연락처</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium text-center">배정 수</th>
              <th className="px-4 py-3 font-medium text-center">상태</th>
              <th className="px-4 py-3 font-medium text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {data.map((worker) => {
              const assignCount = worker.assignments?.[0]?.count ?? 0;
              const status = statusLabel[worker.status] ?? statusLabel.registered!;
              return (
                <tr key={worker.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium">{worker.name}</td>
                  <td className="px-4 py-3 text-slate-500">{worker.phone || "-"}</td>
                  <td className="px-4 py-3 text-slate-500">{worker.email || "-"}</td>
                  <td className="px-4 py-3 text-center">
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
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onView(worker.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Eye size={15} />
                      </button>
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
    </>
  );
}
