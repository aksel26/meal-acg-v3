"use client";

import { X } from "lucide-react";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";
import { getRoomById } from "@/lib/room-constants";

type Props = {
  room: string;
  assignments: RoomAssignmentItem[];
  onCellClick: (e: React.MouseEvent<HTMLTableCellElement>) => void;
  onRemove: (assignment: RoomAssignmentItem) => void;
  isPast?: boolean;
};

const chipColors = [
  "bg-blue-100 text-blue-700 hover:bg-blue-150",
  "bg-violet-100 text-violet-700 hover:bg-violet-150",
  "bg-teal-100 text-teal-700 hover:bg-teal-150",
  "bg-amber-100 text-amber-700 hover:bg-amber-150",
  "bg-rose-100 text-rose-700 hover:bg-rose-150",
  "bg-cyan-100 text-cyan-700 hover:bg-cyan-150",
];

function getChipColor(jobPostingId: string): string {
  let hash = 0;
  for (let i = 0; i < jobPostingId.length; i++) {
    hash = ((hash << 5) - hash + jobPostingId.charCodeAt(i)) | 0;
  }
  return chipColors[Math.abs(hash) % chipColors.length]!;
}

export default function RoomTimetableCell({
  room,
  assignments,
  onCellClick,
  onRemove,
  isPast,
}: Props) {
  const roomInfo = getRoomById(room);
  const isOverCapacity =
    roomInfo &&
    roomInfo.capacity > 0 &&
    assignments.length > roomInfo.capacity;

  return (
    <td
      onClick={onCellClick}
      className={`min-w-[110px] cursor-pointer border-r px-1.5 py-1.5 align-top transition-colors last:border-r-0 ${
        isOverCapacity
          ? "bg-red-50/70"
          : isPast
            ? "hover:bg-slate-100/50"
            : "hover:bg-blue-50/50"
      }`}
    >
      <div className="flex flex-wrap gap-1">
        {assignments.map((a) => {
          const color = getChipColor(a.job_posting_id);
          return (
            <span
              key={`${a.assignment_id}-${a.start_time}`}
              className={`group inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors ${color}`}
            >
              {a.worker_name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(a);
                }}
                className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10"
              >
                <X size={10} />
              </button>
            </span>
          );
        })}
      </div>
      {assignments.length === 0 && (
        <div className="flex h-5 items-center justify-center">
          <span className="text-[10px] text-slate-200 opacity-0 transition-opacity group-hover:opacity-100">
            +
          </span>
        </div>
      )}
    </td>
  );
}
