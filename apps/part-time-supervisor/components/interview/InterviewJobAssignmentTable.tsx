"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useDeleteInterviewJobAssignment } from "@/hooks/use-interview-job-assignments";
import { toast } from "@repo/ui/src/sonner";
import type { InterviewJobAssignment, PersonnelRole } from "@/lib/interview-types";

const roleLabel: Record<PersonnelRole, { text: string; className: string }> = {
  ft: { text: "FT", className: "bg-emerald-50 text-emerald-700" },
  rp: { text: "RP", className: "bg-blue-50 text-blue-700" },
  instructor: { text: "강사", className: "bg-purple-50 text-purple-700" },
  other: { text: "기타", className: "bg-slate-100 text-slate-600" },
};

const roleOrder: Record<string, number> = {
  ft: 0,
  rp: 1,
  instructor: 2,
  other: 3,
};

const payTypeLabel: Record<string, string> = {
  hourly: "시급",
  daily: "일급",
};

export function InterviewJobAssignmentTable({
  assignments,
  isLoading,
  jobPostingId,
  roleFilter,
}: {
  assignments: InterviewJobAssignment[];
  isLoading: boolean;
  jobPostingId: string;
  roleFilter: string;
}) {
  const deleteMutation = useDeleteInterviewJobAssignment(jobPostingId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = assignments
    .filter((a) => !roleFilter || a.personnel?.role === roleFilter)
    .sort((a, b) => {
      const ra = roleOrder[a.personnel?.role || "other"] ?? 99;
      const rb = roleOrder[b.personnel?.role || "other"] ?? 99;
      return ra - rb;
    });

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("이 배정을 삭제하시겠습니까? 관련 근무기록도 함께 삭제됩니다.")) return;
    setDeletingId(assignmentId);
    try {
      await deleteMutation.mutateAsync(assignmentId);
      toast.success("배정이 삭제되었습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">로딩 중...</div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        배정된 인원이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
            <th className="px-3 py-2 font-medium">이름</th>
            <th className="px-3 py-2 font-medium">역할</th>
            <th className="px-3 py-2 font-medium">연락처</th>
            <th className="px-3 py-2 font-medium">급여유형</th>
            <th className="px-3 py-2 font-medium">급여</th>
            <th className="px-3 py-2 font-medium">근무시간</th>
            <th className="px-3 py-2 font-medium">메모</th>
            <th className="w-16 px-3 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((a) => {
            const role = roleLabel[(a.personnel?.role || "other") as PersonnelRole] || roleLabel.other;
            return (
              <tr key={a.id} className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50">
                <td className="px-3 py-3 font-medium text-slate-800">
                  {a.personnel?.name || "-"}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${role.className}`}
                  >
                    {role.text}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {a.personnel?.phone || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {payTypeLabel[a.pay_type] || a.pay_type}
                </td>
                <td className="px-3 py-3 font-medium tabular-nums text-slate-800">
                  {a.pay_rate.toLocaleString()}원
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-600">
                  {a.work_hours ? `${a.work_hours}시간` : "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">{a.note || "-"}</td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
