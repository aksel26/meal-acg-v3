"use client";

import { useRef, useState, useCallback } from "react";
import { ROOMS } from "@/lib/room-constants";
import type { RoomReservation } from "@/hooks/use-room-reservations-new";
import { ReservationBlock } from "./ReservationBlock";

const START_HOUR = 9;
const END_HOUR = 21;
const SLOT_COUNT = (END_HOUR - START_HOUR) * 2; // 24
const ROOM_LABEL_WIDTH = 80;
const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 52;

type DragState =
  | { mode: "idle" }
  | { mode: "create"; roomId: string; startSlot: number; endSlot: number }
  | {
      mode: "move";
      reservationId: string;
      originRoomId: string;
      currentRoomId: string;
      originStartSlot: number;
      originEndSlot: number;
      grabSlot: number;
      currentSlotOffset: number;
    }
  | {
      mode: "resize";
      reservationId: string;
      edge: "left" | "right";
      startSlot: number;
      endSlot: number;
    };

type Props = {
  reservations: RoomReservation[];
  onCreateRequest: (roomId: string, startTime: string, endTime: string) => void;
  onMoveReservation: (id: string, roomId: string, startTime: string, endTime: string) => void;
  onResizeReservation: (
    id: string,
    startTime: string,
    endTime: string
  ) => void;
  onClickReservation: (reservation: RoomReservation) => void;
};

function slotToTime(slot: number): string {
  const totalMinutes = START_HOUR * 60 + slot * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToSlot(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h! * 60 + m! - START_HOUR * 60) / 30;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

const hours = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
);
const slots = Array.from({ length: SLOT_COUNT }, (_, i) => i);

export function TimelineGrid({
  reservations,
  onCreateRequest,
  onMoveReservation,
  onResizeReservation,
  onClickReservation,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState>({ mode: "idle" });
  const didDragRef = useRef(false);

  const getSlotFromX = useCallback((clientX: number): number => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left - ROOM_LABEL_WIDTH;
    const slotWidth = (rect.width - ROOM_LABEL_WIDTH) / SLOT_COUNT;
    return clamp(Math.round(x / slotWidth), 0, SLOT_COUNT);
  }, []);

  const getRoomFromY = useCallback((clientY: number): string | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const y = clientY - rect.top - HEADER_HEIGHT;
    const idx = Math.floor(y / ROW_HEIGHT);
    if (idx < 0 || idx >= ROOMS.length) return null;
    return ROOMS[idx]!.id;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, roomId: string) => {
      // Only left click on empty area
      if (e.button !== 0) return;
      const slot = getSlotFromX(e.clientX);
      didDragRef.current = false;
      setDrag({ mode: "create", roomId, startSlot: slot, endSlot: slot });
    },
    [getSlotFromX]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (drag.mode === "idle") return;
      didDragRef.current = true;

      if (drag.mode === "create") {
        const slot = getSlotFromX(e.clientX);
        setDrag((prev) => {
          if (prev.mode !== "create") return prev;
          return { ...prev, endSlot: slot };
        });
      } else if (drag.mode === "move") {
        const roomId = getRoomFromY(e.clientY);
        const slot = getSlotFromX(e.clientX);
        setDrag((prev) => {
          if (prev.mode !== "move") return prev;
          const slotOffset = slot - prev.grabSlot;
          // 블록이 그리드 밖으로 나가지 않도록 클램프
          const newStart = prev.originStartSlot + slotOffset;
          const newEnd = prev.originEndSlot + slotOffset;
          const clampedOffset =
            newStart < 0
              ? slotOffset - newStart
              : newEnd > SLOT_COUNT
                ? slotOffset - (newEnd - SLOT_COUNT)
                : slotOffset;
          return {
            ...prev,
            currentRoomId: roomId ?? prev.currentRoomId,
            currentSlotOffset: clampedOffset,
          };
        });
      } else if (drag.mode === "resize") {
        const slot = getSlotFromX(e.clientX);
        setDrag((prev) => {
          if (prev.mode !== "resize") return prev;
          if (prev.edge === "left") {
            return { ...prev, startSlot: Math.min(slot, prev.endSlot - 1) };
          }
          return { ...prev, endSlot: Math.max(slot, prev.startSlot + 1) };
        });
      }
    },
    [drag.mode, getSlotFromX, getRoomFromY]
  );

  const handleMouseUp = useCallback(() => {
    if (drag.mode === "create") {
      const s = Math.min(drag.startSlot, drag.endSlot);
      const e = Math.max(drag.startSlot, drag.endSlot);
      if (e > s) {
        onCreateRequest(drag.roomId, slotToTime(s), slotToTime(e));
      }
    } else if (drag.mode === "move") {
      if (
        didDragRef.current &&
        (drag.currentRoomId !== drag.originRoomId || drag.currentSlotOffset !== 0)
      ) {
        const newStart = drag.originStartSlot + drag.currentSlotOffset;
        const newEnd = drag.originEndSlot + drag.currentSlotOffset;
        onMoveReservation(
          drag.reservationId,
          drag.currentRoomId,
          slotToTime(newStart),
          slotToTime(newEnd),
        );
      }
    } else if (drag.mode === "resize") {
      if (didDragRef.current) {
        onResizeReservation(
          drag.reservationId,
          slotToTime(drag.startSlot),
          slotToTime(drag.endSlot)
        );
      }
    }
    setDrag({ mode: "idle" });
  }, [drag, onCreateRequest, onMoveReservation, onResizeReservation]);

  const handleBlockDragStart = useCallback(
    (id: string, roomId: string, e: React.MouseEvent) => {
      didDragRef.current = false;
      const reservation = reservations.find((r) => r.id === id);
      if (!reservation) return;
      const grabSlot = getSlotFromX(e.clientX);
      setDrag({
        mode: "move",
        reservationId: id,
        originRoomId: roomId,
        currentRoomId: roomId,
        originStartSlot: timeToSlot(reservation.start_time),
        originEndSlot: timeToSlot(reservation.end_time),
        grabSlot,
        currentSlotOffset: 0,
      });
    },
    [reservations, getSlotFromX]
  );

  const handleBlockResizeStart = useCallback(
    (id: string, edge: "left" | "right", reservation: RoomReservation) => {
      didDragRef.current = false;
      setDrag({
        mode: "resize",
        reservationId: id,
        edge,
        startSlot: timeToSlot(reservation.start_time),
        endSlot: timeToSlot(reservation.end_time),
      });
    },
    []
  );

  const handleBlockClick = useCallback(
    (reservation: RoomReservation) => {
      // Only fire click if no drag occurred
      if (!didDragRef.current) {
        onClickReservation(reservation);
      }
    },
    [onClickReservation]
  );

  return (
    <div
      ref={gridRef}
      className="select-none overflow-x-auto rounded-lg border bg-white"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{ minWidth: 900 }}>
        {/* Time header row */}
        <div className="flex border-b bg-slate-50" style={{ height: HEADER_HEIGHT }}>
          <div
            className="shrink-0 border-r"
            style={{ width: ROOM_LABEL_WIDTH }}
          />
          <div className="relative flex-1">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute top-0 flex h-full items-center border-l border-slate-200 text-xs text-slate-500"
                style={{ left: `${((i * 2) / SLOT_COUNT) * 100}%` }}
              >
                <span className="pl-1">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Room rows */}
        {ROOMS.map((room) => {
          const roomReservations = reservations.filter(
            (r) => r.room_id === room.id
          );
          const isCreateTarget =
            drag.mode === "create" && drag.roomId === room.id;
          // move 중 이 행에 임시 블록을 표시할지
          const moveGhost =
            drag.mode === "move" && drag.currentRoomId === room.id
              ? {
                  startSlot: drag.originStartSlot + drag.currentSlotOffset,
                  endSlot: drag.originEndSlot + drag.currentSlotOffset,
                  type: reservations.find((r) => r.id === drag.reservationId)?.type ?? "supervisor",
                }
              : null;

          return (
            <div
              key={room.id}
              className="flex border-b"
              style={{ minHeight: ROW_HEIGHT }}
            >
              {/* Room label */}
              <div
                className="flex shrink-0 flex-col justify-center border-r px-2"
                style={{ width: ROOM_LABEL_WIDTH }}
              >
                <div className="text-sm font-medium">{room.name}</div>
                <div className="text-xs text-slate-400">{room.capacity}명</div>
              </div>

              {/* Slot area */}
              <div
                className="relative flex-1"
                onMouseDown={(e) => handleMouseDown(e, room.id)}
              >
                {/* Grid lines */}
                {slots.map((i) => (
                  <div
                    key={i}
                    className={`absolute top-0 bottom-0 ${i % 2 === 0 ? "border-l border-slate-200" : "border-l border-slate-100"}`}
                    style={{ left: `${(i / SLOT_COUNT) * 100}%` }}
                  />
                ))}

                {/* Create drag highlight */}
                {isCreateTarget && (() => {
                  const s = Math.min(drag.startSlot, drag.endSlot);
                  const e = Math.max(drag.startSlot, drag.endSlot);
                  if (e <= s) return null;
                  return (
                    <div
                      className="absolute top-1 bottom-1 rounded border-2 border-dashed border-blue-400 bg-blue-100/50"
                      style={{
                        left: `${(s / SLOT_COUNT) * 100}%`,
                        width: `${((e - s) / SLOT_COUNT) * 100}%`,
                      }}
                    />
                  );
                })()}

                {/* Move ghost block */}
                {moveGhost && (() => {
                  const ghostStyle = moveGhost.type === "supervisor"
                    ? "border-blue-400 bg-blue-100/40"
                    : "border-indigo-400 bg-indigo-100/40";
                  return (
                    <div
                      className={`absolute top-1 bottom-1 rounded border-2 border-dashed ${ghostStyle}`}
                      style={{
                        left: `${(moveGhost.startSlot / SLOT_COUNT) * 100}%`,
                        width: `${(((moveGhost.endSlot - moveGhost.startSlot) / SLOT_COUNT) * 100)}%`,
                      }}
                    />
                  );
                })()}

                {/* Reservation blocks */}
                {roomReservations.map((r) => {
                  const isResizing =
                    drag.mode === "resize" && drag.reservationId === r.id;
                  let startSlot = timeToSlot(r.start_time);
                  let endSlot = timeToSlot(r.end_time);
                  if (isResizing) {
                    startSlot = drag.startSlot;
                    endSlot = drag.endSlot;
                  }
                  const isDragging = false;

                  return (
                    <ReservationBlock
                      key={r.id}
                      reservation={r}
                      left={`${(startSlot / SLOT_COUNT) * 100}%`}
                      width={`${((endSlot - startSlot) / SLOT_COUNT) * 100}%`}
                      isDragging={isDragging}
                      onClick={() => handleBlockClick(r)}
                      onDragStart={(e) =>
                        handleBlockDragStart(r.id, r.room_id, e)
                      }
                      onResizeStart={(edge) =>
                        handleBlockResizeStart(r.id, edge, r)
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
