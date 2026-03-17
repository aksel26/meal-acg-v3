"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useRoomAssignments } from "@/hooks/use-room-assignments";
import { useAssignmentsByJobPosting } from "@/hooks/use-assignments";
import { useJobPostings } from "@/hooks/use-job-postings";
import {
  useDeleteRoomSlot,
  useAddRoomSlot,
} from "@/hooks/use-room-assignment-mutations";
import DateJobPostingNode from "@/components/room-assignments/DateJobPostingNode";
import RoomNode from "@/components/room-assignments/RoomNode";
import WorkerListNode from "@/components/room-assignments/WorkerListNode";
import FlowConnector from "@/components/room-assignments/FlowConnector";
import { getRoomById } from "@/lib/room-constants";
import { toast } from "@repo/ui/src/sonner";
import dayjs from "dayjs";

type DragData = {
  assignmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  workerName: string;
};

export default function RoomAssignmentsPage() {
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [selectedJobPostingId, setSelectedJobPostingId] = useState<
    string | null
  >(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);

  const deleteSlot = useDeleteRoomSlot();
  const addSlot = useAddRoomSlot();

  const { data: jobPostingsData } = useJobPostings();
  const jobPostings = useMemo(
    () =>
      (jobPostingsData || []).filter(
        (jp) => jp.status !== "closed" && jp.status !== "completed"
      ),
    [jobPostingsData]
  );

  const { data: roomData } = useRoomAssignments(date);
  const roomAssignments = roomData?.room_assignments || [];

  const { data: assignments } =
    useAssignmentsByJobPosting(selectedJobPostingId);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDrag(event.active.data.current as DragData);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDrag(null);
      const { active, over } = event;
      if (!over) return;

      const data = active.data.current as DragData;
      const targetRoom = over.id as string;

      if (data.room === targetRoom) return;

      try {
        await deleteSlot.mutateAsync({
          assignment_id: data.assignmentId,
          date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          room: data.room,
        });
        await addSlot.mutateAsync({
          assignment_id: data.assignmentId,
          date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          room: targetRoom,
        });
        const roomName = getRoomById(targetRoom)?.name ?? targetRoom;
        toast.success(`${data.workerName} → ${roomName} 이동 완료`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "회의실 변경에 실패했습니다"
        );
      }
    },
    [deleteSlot, addSlot]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
  }, []);

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="overflow-x-auto">
        <div className="flex items-start gap-0">
          <div className="w-[280px] shrink-0">
            <DateJobPostingNode
              date={date}
              onDateChange={setDate}
              jobPostings={jobPostings}
              selectedJobPostingId={selectedJobPostingId}
              onJobPostingSelect={setSelectedJobPostingId}
            />
          </div>

          <FlowConnector isActive />

          <div className="w-[160px] shrink-0">
            <RoomNode
              roomAssignments={roomAssignments}
              selectedRoom={selectedRoom}
              onSelect={setSelectedRoom}
            />
          </div>

          <FlowConnector isActive={roomAssignments.length > 0} />

          <div className="min-w-[400px] flex-1">
            <WorkerListNode
              roomAssignments={roomAssignments}
              assignments={assignments || []}
              selectedRoom={selectedRoom}
              date={date}
            />
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDrag ? (
          <div className="rounded-lg border border-indigo-200 bg-white px-3 py-2 shadow-lg">
            <p className="text-sm font-medium text-slate-700">
              {activeDrag.workerName}
            </p>
            <p className="text-xs text-slate-400">
              {getRoomById(activeDrag.room)?.name ?? activeDrag.room} →
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
