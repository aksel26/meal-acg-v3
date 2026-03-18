"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { useRoomAssignments } from "@/hooks/use-room-assignments";
import { useAssignmentsByJobPosting } from "@/hooks/use-assignments";
import { useJobPostings } from "@/hooks/use-job-postings";
import { queryKeys } from "@/lib/query-keys";
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

  const queryClient = useQueryClient();
  const deleteSlot = useDeleteRoomSlot();
  const addSlot = useAddRoomSlot();

  const { data: jobPostingsData } = useJobPostings();
  const activeJobPostings = useMemo(
    () =>
      (jobPostingsData || []).filter(
        (jp) => jp.status !== "closed" && jp.status !== "completed"
      ),
    [jobPostingsData]
  );
  const jobPostings = useMemo(
    () => activeJobPostings.filter((jp) => jp.start_date === date),
    [activeJobPostings, date]
  );
  const jobPostingDates = useMemo(
    () => new Set(activeJobPostings.map((jp) => jp.start_date)),
    [activeJobPostings]
  );

  // 공고 목록 로드 시 첫 번째 공고 자동 선택
  useEffect(() => {
    if (jobPostings.length === 0) return;
    const isValid =
      selectedJobPostingId !== null &&
      jobPostings.some((jp) => jp.id === selectedJobPostingId);
    if (!isValid) {
      setSelectedJobPostingId(jobPostings[0]!.id);
    }
  }, [jobPostings, selectedJobPostingId]);

  const { data: roomData } = useRoomAssignments(date, selectedJobPostingId);
  const roomAssignments = roomData?.room_assignments || [];

  const handleJobPostingSelect = useCallback(
    (id: string | null) => {
      if (id === selectedJobPostingId && id !== null) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assignments.byJobPosting(id),
        });
      }
      setSelectedJobPostingId(id);
    },
    [selectedJobPostingId, queryClient]
  );

  const { data: assignments } =
    useAssignmentsByJobPosting(selectedJobPostingId);

  const unassignedCount = useMemo(() => {
    if (!assignments) return 0;
    const assignedIds = new Set(roomAssignments.map((ra) => ra.assignment_id));
    return assignments.filter((a) => !assignedIds.has(a.id)).length;
  }, [assignments, roomAssignments]);

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
        if (targetRoom === "unassigned") {
          // 회의실 → 미배정 (슬롯 삭제)
          await deleteSlot.mutateAsync({
            assignment_id: data.assignmentId,
            date: data.date,
            start_time: data.startTime,
            end_time: data.endTime,
            room: data.room,
          });
          toast.success(`${data.workerName} → 미배정으로 변경`);
        } else if (data.room === "unassigned") {
          // 미배정 → 회의실 신규 배정
          await addSlot.mutateAsync({
            assignment_id: data.assignmentId,
            date: data.date,
            start_time: data.startTime,
            end_time: data.endTime,
            room: targetRoom,
          });
          const roomName = getRoomById(targetRoom)?.name ?? targetRoom;
          toast.success(`${data.workerName} → ${roomName} 배정 완료`);
        } else {
          // 기존 회의실 → 다른 회의실 이동
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
            replace: true,
          });
          const roomName = getRoomById(targetRoom)?.name ?? targetRoom;
          toast.success(`${data.workerName} → ${roomName} 이동 완료`);
        }
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
              jobPostingDates={jobPostingDates}
              selectedJobPostingId={selectedJobPostingId}
              onJobPostingSelect={handleJobPostingSelect}
            />
          </div>

          <FlowConnector isActive />

          <div className="w-[160px] shrink-0">
            <RoomNode
              roomAssignments={roomAssignments}
              selectedRoom={selectedRoom}
              onSelect={setSelectedRoom}
              unassignedCount={unassignedCount}
            />
          </div>

          <FlowConnector isActive={roomAssignments.length > 0} />

          <div className="min-w-[400px] flex-1">
            <WorkerListNode
              roomAssignments={roomAssignments}
              assignments={assignments || []}
              selectedRoom={selectedRoom}
              date={date}
              selectedJobPosting={jobPostings.find((jp) => jp.id === selectedJobPostingId) ?? null}
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
              {activeDrag.room === "unassigned"
                ? "미배정 →"
                : `${getRoomById(activeDrag.room)?.name ?? activeDrag.room} →`}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
