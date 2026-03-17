"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DoorOpen } from "lucide-react";
import { ROOMS } from "@/lib/room-constants";
import FlowNode from "./FlowNode";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";

type Props = {
  roomAssignments: RoomAssignmentItem[];
  selectedRoom: string | null;
  onSelect: (room: string | null) => void;
};

function DroppableRoom({
  roomId,
  name,
  count,
  isSelected,
  onSelect,
}: {
  roomId: string;
  name: string;
  count?: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: roomId });

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
        isOver
          ? "bg-indigo-50 ring-2 ring-indigo-400"
          : isSelected
            ? "bg-indigo-50 font-medium text-indigo-700 ring-1 ring-indigo-300"
            : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span>{name}</span>
      <span
        className={`text-xs ${isOver ? "text-indigo-500" : isSelected ? "text-indigo-500" : "text-slate-400"}`}
      >
        {count !== undefined ? `${count}명` : ""}
      </span>
    </button>
  );
}

export default function RoomNode({
  roomAssignments,
  selectedRoom,
  onSelect,
}: Props) {
  const roomStats = useMemo(() => {
    return ROOMS.map((room) => {
      const workers = new Set(
        roomAssignments
          .filter((a) => a.room === room.id)
          .map((a) => a.worker_id)
      );
      return { roomId: room.id, name: room.name, count: workers.size };
    }).filter((s) => s.count > 0);
  }, [roomAssignments]);

  const totalWorkers = useMemo(
    () => new Set(roomAssignments.map((a) => a.worker_id)).size,
    [roomAssignments]
  );

  return (
    <FlowNode
      step={2}
      title="회의실"
      icon={DoorOpen}
      badge={`${totalWorkers}명`}
      isActive={selectedRoom !== null}
    >
      <div className="space-y-1.5">
        <button
          onClick={() => onSelect(null)}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
            selectedRoom === null
              ? "bg-indigo-50 font-medium text-indigo-700"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span>전체</span>
          <span className="text-xs">{totalWorkers}명</span>
        </button>
        {ROOMS.map((room) => {
          const stat = roomStats.find((s) => s.roomId === room.id);
          return (
            <DroppableRoom
              key={room.id}
              roomId={room.id}
              name={room.name}
              count={stat?.count}
              isSelected={selectedRoom === room.id}
              onSelect={() => onSelect(room.id)}
            />
          );
        })}
      </div>
    </FlowNode>
  );
}
