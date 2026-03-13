"use client";

import { useDeleteWorker } from "@/hooks/use-worker-mutations";
import { toast } from "@repo/ui/src/sonner";
import { Eye, Trash2 } from "lucide-react";
import type { Worker } from "@/lib/supabase/types";

type WorkerRow = Worker & {
  assignments: { count: number }[];
};

const statusLabel: Record<string, { text: string; className: string }> = {
  registered: { text: "등록", className: "bg-slate-100 text-slate-600" },
  contracted: { text: "계약", className: "bg-blue-100 text-blue-700" },
  working: { text: "근무중", className: "bg-green-100 text-green-700" },
  completed: { text: "완료", className: "bg-amber-100 text-amber-700" },
};

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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 지원자를 삭제하시겠습니까? 관련 배정 및 계약서도 함께 삭제됩니다.`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("지원자가 삭제되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  };

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-slate-400">로딩 중...</div>;
  }

  if (!data.length) {
    return <div className="py-10 text-center text-sm text-slate-400">등록된 지원자가 없습니다.</div>;
  }

  return (
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
                <td className="px-4 py-3 text-center">{assignCount}</td>
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
                      onClick={() => handleDelete(worker.id, worker.name)}
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
  );
}
