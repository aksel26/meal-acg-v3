"use client";

import { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Users, GripVertical, X } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { getRoomById } from "@/lib/room-constants";
import { useDeleteRoomSlot } from "@/hooks/use-room-assignment-mutations";
import FlowNode from "./FlowNode";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";
import type { AssignmentWithDetails } from "@/lib/supabase/types";

type Props = {
  roomAssignments: RoomAssignmentItem[];
  assignments: AssignmentWithDetails[];
  selectedRoom: string | null;
  date: string;
};

type EnrichedRow = RoomAssignmentItem & {
  attendance_status: "checked_in" | "confirmed" | null;
  contract_status: "signed" | "confirmed" | null;
};

function StatusBadge({
  value,
  labels,
}: {
  value: string | null;
  labels: { checked_in?: string; signed?: string; confirmed: string; fallback: string };
}) {
  if (value === "checked_in" || value === "signed") {
    return (
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
        {labels.checked_in ?? labels.signed}
      </span>
    );
  }
  if (value === "confirmed") {
    return (
      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
        {labels.confirmed}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
      {labels.fallback}
    </span>
  );
}

function DraggableRow({
  row,
  idx,
  date,
  onDelete,
  isDeleting,
}: {
  row: EnrichedRow;
  idx: number;
  date: string;
  onDelete: (item: RoomAssignmentItem) => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${row.assignment_id}-${row.start_time}-${row.room}`,
    data: {
      assignmentId: row.assignment_id,
      date,
      startTime: row.start_time,
      endTime: row.end_time,
      room: row.room,
      workerName: row.worker_name,
    },
  });

  return (
    <tr
      ref={setNodeRef}
      className={`border-b last:border-b-0 text-sm ${
        idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <td className="w-8 px-1 py-2 text-center">
        <button
          {...attributes}
          {...listeners}
          className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </td>
      <td className="px-3 py-2 font-medium text-slate-700">
        {row.worker_name}
      </td>
      <td className="max-w-[120px] truncate px-3 py-2 text-slate-500">
        {row.job_posting_title}
      </td>
      <td className="px-3 py-2 text-slate-500">
        {getRoomById(row.room)?.name ?? row.room}
      </td>
      <td className="px-3 py-2 tabular-nums text-slate-500">
        {row.start_time}~{row.end_time}
      </td>
      <td className="px-3 py-2">
        <StatusBadge
          value={row.attendance_status}
          labels={{ checked_in: "출석", confirmed: "확인", fallback: "미확인" }}
        />
      </td>
      <td className="px-3 py-2">
        <StatusBadge
          value={row.contract_status}
          labels={{ signed: "서명", confirmed: "확인", fallback: "미서명" }}
        />
      </td>
      <td className="px-2 py-2 text-center">
        <button
          onClick={() => onDelete(row)}
          disabled={isDeleting}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

export default function WorkerListNode({
  roomAssignments,
  assignments,
  selectedRoom,
  date,
}: Props) {
  const deleteSlot = useDeleteRoomSlot();

  const rows = useMemo<EnrichedRow[]>(() => {
    const assignmentMap = new Map(
      assignments.map((a) => [a.id, a])
    );

    const filtered = selectedRoom
      ? roomAssignments.filter((ra) => ra.room === selectedRoom)
      : roomAssignments;

    return filtered.map((ra) => {
      const detail = assignmentMap.get(ra.assignment_id);
      return {
        ...ra,
        attendance_status: detail?.attendance_status ?? null,
        contract_status: detail?.contract_status ?? null,
      };
    });
  }, [roomAssignments, assignments, selectedRoom]);

  const handleDelete = (item: RoomAssignmentItem) => {
    deleteSlot.mutate(
      {
        assignment_id: item.assignment_id,
        date,
        start_time: item.start_time,
        end_time: item.end_time,
        room: item.room,
      },
      {
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <FlowNode
      step={3}
      title="지원자 목록"
      icon={Users}
      badge={`${rows.length}명`}
      isActive={rows.length > 0}
    >
      {rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-400">
          배정된 지원자가 없습니다
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50/60 text-xs text-slate-400">
                <th className="w-8 px-1 py-2" />
                <th className="px-3 py-2 text-left font-medium">이름</th>
                <th className="px-3 py-2 text-left font-medium">공고명</th>
                <th className="px-3 py-2 text-left font-medium">회의실</th>
                <th className="px-3 py-2 text-left font-medium">시간</th>
                <th className="px-3 py-2 text-left font-medium">출석</th>
                <th className="px-3 py-2 text-left font-medium">계약</th>
                <th className="w-9 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <DraggableRow
                  key={`${row.assignment_id}-${row.start_time}-${row.room}`}
                  row={row}
                  idx={idx}
                  date={date}
                  onDelete={handleDelete}
                  isDeleting={deleteSlot.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FlowNode>
  );
}
