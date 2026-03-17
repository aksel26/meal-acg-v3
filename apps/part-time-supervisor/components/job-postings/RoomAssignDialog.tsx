"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import { queryKeys } from "@/lib/query-keys";
import { ROOMS } from "@/lib/room-constants";
import type { JobPosting } from "@/lib/supabase/types";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedIds: Set<string>;
  jobPosting: JobPosting;
  onComplete: () => void;
};

export default function RoomAssignDialog({
  open,
  onClose,
  selectedCount,
  selectedIds,
  jobPosting,
  onComplete,
}: Props) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const queryClient = useQueryClient();

  if (!open) return null;

  const startTime = jobPosting.work_start ?? "09:00";
  const startHour = parseInt(startTime.split(":")[0] ?? "9", 10);
  const endTime = `${String(startHour + 1).padStart(2, "0")}:00`;
  const slotBase = {
    date: jobPosting.start_date,
    start_time: startTime,
    end_time: endTime,
  };

  const handleAssign = async () => {
    if (!selectedRoom) return;
    setIsAssigning(true);

    const results = await Promise.allSettled(
      Array.from(selectedIds).map((assignmentId) =>
        fetch("/api/room-assignments/slot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignment_id: assignmentId, room: selectedRoom, ...slotBase }),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "배정 실패");
          }
        })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    queryClient.invalidateQueries({ queryKey: queryKeys.roomAssignments.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });

    if (failed === 0) {
      toast.success(`${succeeded}명 배정 완료`);
    } else if (succeeded > 0) {
      toast.warning(`${succeeded}명 배정 완료, ${failed}명 실패`);
    } else {
      toast.error("배정에 실패했습니다.");
    }

    setIsAssigning(false);
    setSelectedRoom(null);
    onComplete();
    onClose();
  };

  const handleClose = () => {
    setSelectedRoom(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-80 rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-base font-semibold">회의실 배정</h3>
        <p className="mb-4 text-sm text-slate-500">{selectedCount}명에게 회의실을 배정합니다</p>

        <div className="space-y-1.5 mb-6">
          {ROOMS.map((room) => (
            <label
              key={room.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                selectedRoom === room.id
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="room"
                value={room.id}
                checked={selectedRoom === room.id}
                onChange={() => setSelectedRoom(room.id)}
                className="accent-blue-600"
              />
              <span className="text-sm font-medium">{room.name}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedRoom || isAssigning}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {isAssigning ? "배정 중..." : "배정하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
