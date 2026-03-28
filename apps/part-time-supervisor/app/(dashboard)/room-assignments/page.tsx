"use client";

import { useState, useCallback } from "react";
import { useRoomReservations } from "@/hooks/use-room-reservations-new";
import { useUpdateRoomReservation } from "@/hooks/use-room-reservation-new-mutations";
import { TimelineGrid } from "@/components/room-reservations/TimelineGrid";
import ReservationDialog from "@/components/room-reservations/ReservationDialog";
import { toast } from "@repo/ui/src/sonner";
import type { RoomReservation } from "@/hooks/use-room-reservations-new";

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export default function RoomAssignmentsPage() {
  const [date, setDate] = useState(getTodayString);
  const { data: reservations, isLoading } = useRoomReservations(date);
  const updateMutation = useUpdateRoomReservation();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogProps, setDialogProps] = useState<{
    roomId?: string;
    startTime?: string;
    endTime?: string;
    reservation?: RoomReservation;
  }>({});

  const handleDateChange = (direction: -1 | 1) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + direction);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setDate(`${y}-${m}-${day}`);
  };

  const handleCreateRequest = useCallback((roomId: string, startTime: string, endTime: string) => {
    setDialogProps({ roomId, startTime, endTime, reservation: undefined });
    setDialogOpen(true);
  }, []);

  const handleMoveReservation = useCallback(async (id: string, roomId: string) => {
    try {
      const res = await updateMutation.mutateAsync({ id, room_id: roomId });
      if (res.warning) toast.warning("이동한 시간에 다른 예약이 있습니다.");
    } catch {
      toast.error("이동에 실패했습니다.");
    }
  }, [updateMutation]);

  const handleResizeReservation = useCallback(async (id: string, startTime: string, endTime: string) => {
    try {
      const res = await updateMutation.mutateAsync({ id, start_time: startTime, end_time: endTime });
      if (res.warning) toast.warning("변경된 시간에 다른 예약이 있습니다.");
    } catch {
      toast.error("시간 변경에 실패했습니다.");
    }
  }, [updateMutation]);

  const handleClickReservation = useCallback((reservation: RoomReservation) => {
    setDialogProps({ reservation, roomId: undefined, startTime: undefined, endTime: undefined });
    setDialogOpen(true);
  }, []);

  // Date display with day of week
  const dateObj = new Date(date + "T00:00:00");
  const displayDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${DAY_NAMES[dateObj.getDay()]})`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3">
          <button onClick={() => handleDateChange(-1)} className="text-slate-400 hover:text-slate-600">&larr;</button>
          <span className="min-w-[180px] text-center font-medium text-slate-900">{displayDate}</span>
          <button onClick={() => handleDateChange(1)} className="text-slate-400 hover:text-slate-600">&rarr;</button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-200" /> 감독관
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-200" /> 면접교육
          </span>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center text-slate-400">불러오는 중...</div>
      ) : (
        <TimelineGrid
          reservations={reservations ?? []}
          onCreateRequest={handleCreateRequest}
          onMoveReservation={handleMoveReservation}
          onResizeReservation={handleResizeReservation}
          onClickReservation={handleClickReservation}
        />
      )}

      {/* Reservation Dialog */}
      <ReservationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        date={date}
        {...dialogProps}
      />
    </div>
  );
}
