"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/src/popover";
import { queryKeys } from "@/lib/query-keys";
import { ROOMS, getRoomById } from "@/lib/room-constants";
import type { JobPosting, AssignmentWithDetails } from "@/lib/supabase/types";

type Props = {
  selectedCount: number;
  selectedIds: Set<string>;
  jobPosting: JobPosting;
  assignments: AssignmentWithDetails[];
  onComplete: () => void;
  disabled?: boolean;
};

type Step = "select" | "confirm";

export default function RoomAssignPopover({
  selectedCount,
  selectedIds,
  jobPosting,
  assignments,
  onComplete,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const queryClient = useQueryClient();

  const { alreadyAssigned, newAssignments, sourceRooms } = useMemo(() => {
    const selected = assignments.filter((a) => selectedIds.has(a.id));
    const already = selected.filter((a) => {
      const rooms = new Set(a.room_slots?.map((s) => s.room) ?? []);
      return rooms.size > 0 && (selectedRoom ? !rooms.has(selectedRoom) : false);
    });
    const fresh = selected.filter((a) => !already.includes(a));
    const sources = new Set(
      already.flatMap((a) => a.room_slots?.map((s) => s.room) ?? [])
    );
    return { alreadyAssigned: already, newAssignments: fresh, sourceRooms: sources };
  }, [assignments, selectedIds, selectedRoom]);

  // 회의실별 현재 배정 인원 카운트
  const roomCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const room of ROOMS) {
      counts[room.id] = 0;
    }
    for (const a of assignments) {
      for (const slot of a.room_slots ?? []) {
        if (slot.room && slot.room in counts) {
          counts[slot.room] = (counts[slot.room] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [assignments]);

  const startTime = jobPosting.work_start ?? "09:00";
  const startHour = parseInt(startTime.split(":")[0] ?? "9", 10);
  const endTime = `${String(startHour + 1).padStart(2, "0")}:00`;
  const slotBase = {
    date: jobPosting.start_date,
    start_time: startTime,
    end_time: endTime,
  };

  const handleNext = () => {
    if (!selectedRoom) return;
    if (alreadyAssigned.length > 0) {
      setStep("confirm");
    } else {
      handleAssign(false);
    }
  };

  const handleAssign = async (withReplace: boolean) => {
    if (!selectedRoom) return;
    setIsAssigning(true);

    const calls = [
      ...newAssignments.map((a) =>
        fetch("/api/room-assignments/slot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignment_id: a.id, room: selectedRoom, ...slotBase }),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "배정 실패");
          }
        })
      ),
      ...(withReplace
        ? alreadyAssigned.map((a) =>
            fetch("/api/room-assignments/slot?replace=true", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ assignment_id: a.id, room: selectedRoom, ...slotBase }),
            }).then(async (res) => {
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "배정 실패");
              }
            })
          )
        : []),
    ];

    const results = await Promise.allSettled(calls);
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
    handleClose();
    onComplete();
  };

  const handleClose = () => {
    setSelectedRoom(null);
    setStep("select");
    setOpen(false);
  };

  const handleBackToSelect = () => {
    setStep("select");
  };

  const confirmMessage = useMemo(() => {
    if (alreadyAssigned.length === 0) return "";
    const firstName = alreadyAssigned[0]?.worker?.name ?? "지원자";
    const count = alreadyAssigned.length;
    const targetName = getRoomById(selectedRoom ?? "")?.name ?? selectedRoom;

    if (sourceRooms.size === 1) {
      const sourceRoomId = [...sourceRooms][0] ?? "";
      const sourceName = getRoomById(sourceRoomId)?.name ?? sourceRoomId;
      return count === 1
        ? `${firstName}님이 이미 ${sourceName}에 배정되어 있습니다. ${targetName}(으)로 변경하시겠습니까?`
        : `${firstName} 외 ${count - 1}명이 이미 ${sourceName}에 배정되어 있습니다. ${targetName}(으)로 변경하시겠습니까?`;
    } else {
      return count === 1
        ? `${firstName}님이 이미 다른 회의실에 배정되어 있습니다. ${targetName}(으)로 변경하시겠습니까?`
        : `${firstName} 외 ${count - 1}명이 이미 다른 회의실에 배정되어 있습니다. ${targetName}(으)로 변경하시겠습니까?`;
    }
  }, [alreadyAssigned, selectedRoom, sourceRooms]);

  return (
    <Popover open={open} onOpenChange={(v) => { if (v) setOpen(true); }}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          회의실 배정
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {step === "select" ? (
          <div className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-semibold">회의실 배정</h3>
              <button
                onClick={handleClose}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              {selectedCount}명에게 회의실을 배정합니다
            </p>

            <div className="mb-4 space-y-1.5">
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

            {/* 회의실별 현황 */}
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="mb-1.5 text-xs font-medium text-slate-500">회의실별 현황</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {ROOMS.map((room) => {
                  const count = roomCounts[room.id] ?? 0;
                  const isFull = count >= room.capacity;
                  return (
                    <div key={room.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{room.name}</span>
                      <span className={isFull ? "font-medium text-red-500" : "text-slate-500"}>
                        {count}/{room.capacity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedRoom || isAssigning}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {isAssigning ? "배정 중..." : "배정하기"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="mb-1 text-base font-semibold">회의실 변경 확인</h3>
            <p className="my-4 text-sm leading-relaxed text-slate-600">
              {confirmMessage}
            </p>
            {newAssignments.length > 0 && (
              <p className="mb-4 text-xs text-slate-400">
                나머지 {newAssignments.length}명은 신규 배정됩니다.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleBackToSelect}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={() => handleAssign(true)}
                disabled={isAssigning}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {isAssigning ? "변경 중..." : "변경하기"}
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
