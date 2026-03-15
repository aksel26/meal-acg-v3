"use client";

import { useState, useMemo } from "react";
import { ROOMS } from "@/lib/room-constants";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";
import type { AssignmentWithDetails } from "@/lib/supabase/types";
import {
  useAddRoomSlot,
  useDeleteRoomSlot,
} from "@/hooks/use-room-assignment-mutations";
import RoomTimetableCell from "./RoomTimetableCell";
import WorkerSelectPopover from "./WorkerSelectPopover";
import { toast } from "@repo/ui/src/sonner";
import dayjs from "dayjs";

type Props = {
  date: string;
  startHour: number;
  endHour: number;
  roomAssignments: RoomAssignmentItem[];
  availableAssignments: AssignmentWithDetails[];
};

export default function RoomTimetable({
  date,
  startHour,
  endHour,
  roomAssignments,
  availableAssignments,
}: Props) {
  const [popover, setPopover] = useState<{
    open: boolean;
    timeSlot: string;
    room: string;
    anchorRect: { top: number; left: number } | null;
  }>({ open: false, timeSlot: "", room: "", anchorRect: null });

  const addSlot = useAddRoomSlot();
  const deleteSlot = useDeleteRoomSlot();

  const timeSlots = Array.from({ length: endHour - startHour }, (_, i) => {
    const hour = startHour + i;
    return `${String(hour).padStart(2, "0")}:00`;
  });

  const isToday = date === dayjs().format("YYYY-MM-DD");
  const currentHour = dayjs().hour();

  const roomOccupancy = useMemo(() => {
    const map = new Map<string, number>();
    for (const room of ROOMS) {
      const count = new Set(
        roomAssignments.filter((a) => a.room === room.id).map((a) => a.worker_id)
      ).size;
      map.set(room.id, count);
    }
    return map;
  }, [roomAssignments]);

  const handleCellClick = (
    timeSlot: string,
    room: string,
    e: React.MouseEvent<HTMLTableCellElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({
      open: true,
      timeSlot,
      room,
      anchorRect: { top: rect.bottom + 4, left: rect.left },
    });
  };

  const handleSelect = (assignment: AssignmentWithDetails) => {
    const endHourNum =
      parseInt(popover.timeSlot.split(":")[0] ?? "0", 10) + 1;
    const endTime = `${String(endHourNum).padStart(2, "0")}:00`;

    addSlot.mutate(
      {
        assignment_id: assignment.id,
        date,
        start_time: popover.timeSlot,
        end_time: endTime,
        room: popover.room,
      },
      {
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRemove = (item: RoomAssignmentItem) => {
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
    <>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-slate-50/80">
              <th className="sticky left-0 z-10 w-[72px] bg-slate-50/80 px-3 py-2.5 text-left text-xs font-semibold text-slate-400">
                시간
              </th>
              {ROOMS.map((room) => {
                const count = roomOccupancy.get(room.id) || 0;
                return (
                  <th
                    key={room.id}
                    className="min-w-[110px] px-2 py-2.5 text-center"
                  >
                    <div className="text-xs font-semibold text-slate-700">
                      {room.name}
                    </div>
                    <div className="mt-0.5 text-[10px] tabular-nums text-slate-400">
                      {count > 0 ? `${count}명 배정` : "비어있음"}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot, idx) => {
              const hour = startHour + idx;
              const isCurrent = isToday && hour === currentHour;
              const isPast = isToday && hour < currentHour;

              return (
                <tr
                  key={timeSlot}
                  className={`border-b transition-colors ${
                    isCurrent
                      ? "bg-blue-50/60"
                      : isPast
                        ? "bg-slate-50/40"
                        : idx % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/30"
                  }`}
                >
                  <td
                    className={`sticky left-0 z-10 px-3 py-2 text-xs font-medium tabular-nums ${
                      isCurrent
                        ? "bg-blue-50/60 text-blue-600 font-semibold"
                        : isPast
                          ? "bg-slate-50/40 text-slate-300"
                          : idx % 2 === 0
                            ? "bg-white text-slate-500"
                            : "bg-slate-50/30 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isCurrent && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      )}
                      {timeSlot}
                    </div>
                  </td>
                  {ROOMS.map((room) => {
                    const cellAssignments = roomAssignments.filter(
                      (a) =>
                        a.start_time === timeSlot && a.room === room.id
                    );
                    return (
                      <RoomTimetableCell
                        key={room.id}
                        room={room.id}
                        assignments={cellAssignments}
                        onCellClick={(e) =>
                          handleCellClick(timeSlot, room.id, e)
                        }
                        onRemove={handleRemove}
                        isPast={isPast}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <WorkerSelectPopover
        open={popover.open}
        onClose={() => setPopover((p) => ({ ...p, open: false }))}
        onSelect={handleSelect}
        availableAssignments={availableAssignments}
        roomAssignments={roomAssignments}
        timeSlot={popover.timeSlot}
        room={popover.room}
        anchorRect={popover.anchorRect}
      />
    </>
  );
}
