"use client";

import { useState, useEffect, useRef } from "react";
import type { AssignmentWithDetails } from "@/lib/supabase/types";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";
import { Search } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (assignment: AssignmentWithDetails) => void;
  availableAssignments: AssignmentWithDetails[];
  roomAssignments: RoomAssignmentItem[];
  timeSlot: string;
  room: string;
  anchorRect: { top: number; left: number } | null;
};

export default function WorkerSelectPopover({
  open,
  onClose,
  onSelect,
  availableAssignments,
  roomAssignments,
  timeSlot,
  room,
  anchorRect,
}: Props) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open || !anchorRect) return null;

  const assignedWorkerIds = new Set(
    roomAssignments
      .filter((ra) => ra.start_time === timeSlot && ra.room === room)
      .map((ra) => ra.worker_id)
  );

  const filtered = availableAssignments.filter((a) => {
    if (assignedWorkerIds.has(a.worker_id)) return false;
    if (!search) return true;
    return a.worker?.name?.includes(search);
  });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-60 overflow-hidden rounded-xl border bg-white shadow-xl"
        style={{ top: anchorRect.top, left: anchorRect.left }}
      >
        <div className="border-b p-2">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="이름 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-300"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              배정 가능한 지원자가 없습니다
            </div>
          ) : (
            filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onSelect(a);
                  onClose();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-slate-50"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-600">
                  {(a.worker?.name || "?")[0]}
                </div>
                <span className="truncate">{a.worker?.name || "이름 없음"}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
