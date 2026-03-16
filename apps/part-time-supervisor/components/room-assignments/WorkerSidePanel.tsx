"use client";

import type { AssignmentWithDetails, JobPosting } from "@/lib/supabase/types";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";
import { getRoomById } from "@/lib/room-constants";
import { UserCheck, AlertCircle } from "lucide-react";

type Props = {
  assignments: AssignmentWithDetails[];
  roomAssignments: RoomAssignmentItem[];
  jobPostings: JobPosting[];
  selectedJobPostingId: string | null;
  onJobPostingChange: (id: string | null) => void;
};

export default function WorkerSidePanel({
  assignments,
  roomAssignments,
  jobPostings,
  selectedJobPostingId,
  onJobPostingChange,
}: Props) {
  const workerRoomMap = new Map<string, Set<string>>();
  for (const ra of roomAssignments) {
    if (!workerRoomMap.has(ra.worker_id)) {
      workerRoomMap.set(ra.worker_id, new Set());
    }
    workerRoomMap.get(ra.worker_id)!.add(ra.room);
  }

  const assigned = assignments.filter((a) => workerRoomMap.has(a.worker_id));
  const unassigned = assignments.filter(
    (a) => !workerRoomMap.has(a.worker_id)
  );

  const total = assignments.length;
  const assignedCount = assigned.length;
  const rate = total > 0 ? Math.round((assignedCount / total) * 100) : 0;

  return (
    <div className="flex-1 min-w-0 space-y-3">
      {/* 공고 선택 */}
      <div className="rounded-xl border bg-white p-4 space-y-2">
        <label className="block text-xs font-medium text-slate-500">공고</label>
        <select
          value={selectedJobPostingId || ""}
          onChange={(e) => onJobPostingChange(e.target.value || null)}
          className="h-9 w-full rounded-lg border bg-white px-3 text-sm"
        >
          <option value="">전체 공고</option>
          {jobPostings.map((jp) => (
            <option key={jp.id} value={jp.id}>
              {jp.title}
            </option>
          ))}
        </select>
      </div>
      {total > 0 && (
        <div className="rounded-xl border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">배정률</span>
            <span className="text-xs font-semibold tabular-nums text-slate-700">
              {assignedCount}/{total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                rate === 100
                  ? "bg-green-400"
                  : rate >= 50
                    ? "bg-blue-400"
                    : "bg-orange-400"
              }`}
              style={{ width: `${rate}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[10px] tabular-nums text-slate-400">
            {rate}%
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-white p-4">
        <h4 className="mb-3 text-sm font-semibold">지원자 목록</h4>

        {unassigned.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-center gap-1">
              <AlertCircle size={12} className="text-orange-500" />
              <span className="text-xs font-medium text-orange-600">
                미배정 ({unassigned.length})
              </span>
            </div>
            <div className="space-y-1">
              {unassigned.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-orange-200/60 bg-orange-50/50 px-2.5 py-1.5 text-sm"
                >
                  {a.worker?.name || "이름 없음"}
                </div>
              ))}
            </div>
          </div>
        )}

        {assigned.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1">
              <UserCheck size={12} className="text-green-500" />
              <span className="text-xs font-medium text-green-600">
                배정 완료 ({assigned.length})
              </span>
            </div>
            <div className="space-y-1">
              {assigned.map((a) => {
                const rooms = Array.from(
                  workerRoomMap.get(a.worker_id) || []
                );
                const roomNames = rooms
                  .map((r) => getRoomById(r)?.name || r)
                  .join(", ");
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-green-200/60 bg-green-50/50 px-2.5 py-1.5 text-sm"
                  >
                    <span>{a.worker?.name || "이름 없음"}</span>
                    <span className="text-[11px] tabular-nums text-green-600/80">
                      {roomNames}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {assignments.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-400">
            공고를 선택하면 지원자가 표시됩니다
          </p>
        )}
      </div>
    </div>
  );
}
