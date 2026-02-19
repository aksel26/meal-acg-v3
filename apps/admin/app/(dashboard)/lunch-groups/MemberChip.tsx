"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { Member } from "@/lib/supabase/types";

interface MemberChipProps {
  member: Member;
}

export function MemberChip({ member }: MemberChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: member.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all cursor-grab active:cursor-grabbing ${
        isDragging
          ? "opacity-50 border-blue-300 bg-blue-50"
          : "bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-gray-100"
      }`}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />
      <span className="text-sm font-medium text-gray-700">{member.full_name}</span>
    </div>
  );
}
