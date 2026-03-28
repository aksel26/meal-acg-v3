"use client";

import type { RoomReservation } from "@/hooks/use-room-reservations-new";

type Props = {
  reservation: RoomReservation;
  left: string;
  width: string;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (edge: "left" | "right") => void;
};

const TYPE_STYLES = {
  supervisor: {
    bg: "bg-blue-100",
    border: "border-l-blue-500",
    text: "text-blue-800",
    label: "감독관",
  },
  interview: {
    bg: "bg-indigo-100",
    border: "border-l-indigo-500",
    text: "text-indigo-800",
    label: "면접교육",
  },
} as const;

export function ReservationBlock({
  reservation,
  left,
  width,
  isDragging,
  onClick,
  onDragStart,
  onResizeStart,
}: Props) {
  const style = TYPE_STYLES[reservation.type];

  return (
    <div
      data-reservation={reservation.id}
      className={`group absolute top-1 bottom-1 flex items-center overflow-hidden rounded border-l-[3px] px-2 text-xs transition-shadow ${style.bg} ${style.border} ${style.text} ${isDragging ? "opacity-50 shadow-lg" : "cursor-grab hover:shadow-md"}`}
      style={{ left, width }}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!(e.target as HTMLElement).dataset.resize) {
          onDragStart(e);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Left resize handle */}
      <div
        data-resize="left"
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart("left");
        }}
      />

      <span className="truncate font-medium">
        {style.label}
        {reservation.title ? ` - ${reservation.title}` : ""}
      </span>

      {/* Right resize handle */}
      <div
        data-resize="right"
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart("right");
        }}
      />
    </div>
  );
}
