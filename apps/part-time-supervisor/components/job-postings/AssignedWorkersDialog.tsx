"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { X } from "lucide-react";
import type { AssignmentWithDetails } from "@/lib/supabase/types";

const assignmentStatusLabel: Record<string, { text: string; className: string }> = {
  assigned: { text: "배정", className: "bg-blue-50 text-blue-700" },
  working: { text: "근무중", className: "bg-green-50 text-green-700" },
  completed: { text: "완료", className: "bg-purple-50 text-purple-700" },
  cancelled: { text: "취소", className: "bg-red-50 text-red-700" },
};

export default function AssignedWorkersDialog({
  jobPostingId,
  onClose,
}: {
  jobPostingId: string | null;
  onClose: () => void;
}) {
  const { data: assignments, isLoading } = useQuery<AssignmentWithDetails[]>({
    queryKey: queryKeys.assignments.byJobPosting(jobPostingId!),
    queryFn: async () => {
      const res = await fetch(`/api/assignments?job_posting_id=${jobPostingId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!jobPostingId,
  });

  if (!jobPostingId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">배정 명단</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-400">로딩 중...</div>
        ) : !assignments?.length ? (
          <div className="py-8 text-center text-sm text-slate-400">배정된 인원이 없습니다.</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">연락처</th>
                  <th className="px-3 py-2 font-medium text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const status = assignmentStatusLabel[a.status] ?? assignmentStatusLabel.assigned!;
                  return (
                    <tr key={a.id} className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium text-slate-800">{a.worker?.name || "-"}</td>
                      <td className="px-3 py-3 text-slate-600">{a.worker?.phone || "-"}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
