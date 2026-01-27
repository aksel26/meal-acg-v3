"use client";

import { useDroppable } from "@dnd-kit/core";
import { Member } from "@/lib/supabase/types";
import { MemberChip } from "./MemberChip";

interface GroupCardProps {
  groupNumber: number;
  memberIds: string[];
  members: Member[];
}

export function GroupCard({ groupNumber, memberIds, members }: GroupCardProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: groupNumber.toString(),
  });

  const groupMembers = memberIds
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean) as Member[];

  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded-xl border-2 transition-all min-h-[160px] ${
        isOver
          ? "border-blue-400 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {/* 조 번호 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center bg-gray-900 text-white text-sm font-bold rounded-lg">
            {groupNumber}
          </span>
          <span className="text-sm font-medium text-gray-600">조</span>
        </div>
        <span className="text-xs text-gray-400">{groupMembers.length}명</span>
      </div>

      {/* 멤버 목록 */}
      <div className="space-y-2">
        {groupMembers.length === 0 ? (
          <div className="text-center py-4 text-gray-400 text-sm">
            멤버를 드래그하여 추가하세요
          </div>
        ) : (
          groupMembers.map((member) => (
            <MemberChip key={member.id} member={member} />
          ))
        )}
      </div>
    </div>
  );
}
