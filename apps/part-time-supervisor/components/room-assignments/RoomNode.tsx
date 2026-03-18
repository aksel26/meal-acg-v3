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
  unassignedCount: number;
};

function DroppableRoom({
  roomId,
  name,
  count,
  capacity,
  isSelected,
  onSelect,
}: {
  roomId: string;
  name: string;
  count?: number;
  capacity: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: roomId });
  const current = count ?? 0;
  const isOver80 = capacity > 0 && current / capacity >= 0.8;
  const isFull = capacity > 0 && current >= capacity;

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
        isOver
          ? "bg-indigo-50"
          : isSelected
            ? "bg-indigo-50 font-medium text-indigo-700"
            : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span>{name}</span>
      <span
        className={`text-xs tabular-nums ${
          isOver || isSelected
            ? "text-indigo-500"
            : isFull
              ? "text-red-500 font-medium"
              : isOver80
                ? "text-amber-500"
                : "text-slate-400"
        }`}
      >
        {current > 0 || isSelected ? `${current}/${capacity}` : `0/${capacity}`}
      </span>
    </button>
  );
}

function DroppableUnassigned({
  count,
  isSelected,
  onSelect,
}: {
  count: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned" });

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
        isOver
          ? "bg-amber-50"
          : isSelected
            ? "bg-amber-50 font-medium text-amber-700"
            : "text-slate-500 hover:bg-slate-50"
      }`}
    >
      <span>미배정</span>
      <span
        className={`text-xs ${isOver ? "text-amber-500" : isSelected ? "text-amber-500" : "text-slate-400"}`}
      >
        {count > 0 ? `${count}명` : ""}
      </span>
    </button>
  );
}

export default function RoomNode({
  roomAssignments,
  selectedRoom,
  onSelect,
  unassignedCount,
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
        {ROOMS.map((room) => {
          const stat = roomStats.find((s) => s.roomId === room.id);
          return (
            <DroppableRoom
              key={room.id}
              roomId={room.id}
              name={room.name}
              count={stat?.count}
              capacity={room.capacity}
              isSelected={selectedRoom === room.id}
              onSelect={() => onSelect(room.id)}
            />
          );
        })}
        <DroppableUnassigned
          count={unassignedCount}
          isSelected={selectedRoom === "unassigned"}
          onSelect={() => onSelect("unassigned")}
        />
      </div>
    </FlowNode>
  );
}
