"use client";

import { useUpdateAssignment, useDeleteAssignment } from "@/hooks/use-assignment-mutations";
import { toast } from "@repo/ui/src/sonner";
import { Trash2 } from "lucide-react";
import type { Assignment } from "@/lib/supabase/types";

type AssignmentRow = Assignment & {
  worker: { id: string; name: string; phone: string | null; status: string } | null;
  job_posting: { id: string; title: string; status: string } | null;
};

const statusOptions = [
  { value: "assigned", label: "배정" },
  { value: "working", label: "근무중" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

const statusColors: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-700",
  working: "bg-green-100 text-green-700",
  completed: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AssignmentTable({
  data,
  isLoading,
}: {
  data: AssignmentRow[];
  isLoading: boolean;
}) {
  const updateMutation = useUpdateAssignment();
  const deleteMutation = useDeleteAssignment();

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateMutation.mutateAsync({ id, status });
      toast.success("배정 상태가 변경되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("배정을 해제하시겠습니까?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("배정이 해제되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "해제에 실패했습니다.");
    }
  };

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-slate-400">로딩 중...</div>;
  }

  if (!data.length) {
    return <div className="py-10 text-center text-sm text-slate-400">배정 내역이 없습니다.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium">공고</th>
            <th className="px-4 py-3 font-medium">지원자</th>
            <th className="px-4 py-3 font-medium">배정일</th>
            <th className="px-4 py-3 font-medium text-center">상태</th>
            <th className="px-4 py-3 font-medium text-center">관리</th>
          </tr>
        </thead>
        <tbody>
          {data.map((assignment) => (
            <tr key={assignment.id} className="border-b last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium">
                {assignment.job_posting?.title || "삭제된 공고"}
              </td>
              <td className="px-4 py-3">{assignment.worker?.name || "삭제된 지원자"}</td>
              <td className="px-4 py-3 text-slate-500">
                {assignment.assigned_at?.split("T")[0]}
              </td>
              <td className="px-4 py-3 text-center">
                <select
                  value={assignment.status}
                  onChange={(e) => handleStatusChange(assignment.id, e.target.value)}
                  className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ${statusColors[assignment.status] || ""}`}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => handleDelete(assignment.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
