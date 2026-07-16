"use client";

import type { RoomReservation } from "@/hooks/use-room-reservations";

type Props = {
  reservation: RoomReservation;
  left: string;
  width: string;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (edge: "left" | "right") => void;
  readOnly?: boolean;
};

const TYPE_STYLES: Record<
  string,
  { bg: string; indicator: string; text: string; label: string }
> = {
  supervisor: {
    bg: "bg-blue-50",
    indicator: "bg-blue-500",
    text: "text-blue-800",
    label: "감독관",
  },
  interview: {
    bg: "bg-blue-50",
    indicator: "bg-blue-500",
    text: "text-blue-800",
    label: "면접",
  },
  meeting: {
    bg: "bg-emerald-50",
    indicator: "bg-emerald-500",
    text: "text-emerald-800",
    label: "회의",
  },
  client_meeting: {
    bg: "bg-amber-50",
    indicator: "bg-amber-500",
    text: "text-amber-800",
    label: "고객사 미팅",
  },
  partner_meeting: {
    bg: "bg-rose-50",
    indicator: "bg-rose-500",
    text: "text-rose-800",
    label: "협력사 미팅",
  },
};

export function ReservationBlock({
  reservation,
  left,
  width,
  isDragging,
  onClick,
  onDragStart,
  onResizeStart,
  readOnly = false,
}: Props) {
  const style = (TYPE_STYLES[reservation.type] ?? TYPE_STYLES["supervisor"])!;

  return (
    <div
      data-reservation={reservation.id}
      className={`group absolute top-1 bottom-1 flex items-center gap-1.5 overflow-hidden rounded-lg px-2 text-xs transition-shadow ${style.bg} ${style.text} ${isDragging ? "opacity-50 shadow-lg" : readOnly ? "" : "cursor-grab"}`}
      style={{ left, width }}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!readOnly && !(e.target as HTMLElement).dataset.resize) {
          onDragStart(e);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!readOnly) onClick();
      }}
    >
      {!readOnly && (
        <div
          data-resize="left"
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100"
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart("left");
          }}
        />
      )}

      <span className={`h-3.5 w-1.5 shrink-0 rounded-sm ${style.indicator}`} />

      <span className="truncate font-medium">
        {style.label}
        {reservation.title ? ` - ${reservation.title}` : ""}
      </span>

      {!readOnly && (
        <div
          data-resize="right"
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100"
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart("right");
          }}
        />
      )}
    </div>
  );
}
