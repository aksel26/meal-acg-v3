"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { useMembers } from "@/hooks/use-members";
import {
  useCreateRoomReservation,
  useUpdateRoomReservation,
  useDeleteRoomReservation,
} from "@/hooks/use-room-reservation-new-mutations";
import { getRoomById } from "@/lib/room-constants";
import type { RoomReservation } from "@/hooks/use-room-reservations-new";

type Props = {
  open: boolean;
  onClose: () => void;
  date: string;
  // Create mode
  roomId?: string;
  startTime?: string;
  endTime?: string;
  // Edit mode
  reservation?: RoomReservation;
};

export default function ReservationDialog({
  open,
  onClose,
  date,
  roomId,
  startTime,
  endTime,
  reservation,
}: Props) {
  const isEdit = !!reservation;

  const effectiveRoomId = reservation?.room_id ?? roomId ?? "";
  const effectiveStart = reservation?.start_time?.slice(0, 5) ?? startTime ?? "";
  const effectiveEnd = reservation?.end_time?.slice(0, 5) ?? endTime ?? "";
  const room = getRoomById(effectiveRoomId);

  // Form state
  const [type, setType] = useState<"supervisor" | "interview">("supervisor");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ccMembers, setCcMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: members = [] } = useMembers();
  const createMutation = useCreateRoomReservation();
  const updateMutation = useUpdateRoomReservation();
  const deleteMutation = useDeleteRoomReservation();

  // Initialize form state when dialog opens or reservation changes
  useEffect(() => {
    if (open) {
      setType(reservation?.type ?? "supervisor");
      setTitle(reservation?.title ?? "");
      setContent(reservation?.content ?? "");
      setCcMembers(reservation?.cc_members ?? []);
      setMemberSearch("");
      setShowDropdown(false);
      setShowDeleteConfirm(false);
    }
  }, [open, reservation]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredMembers = members.filter(
    (m) =>
      !ccMembers.includes(m.full_name) &&
      m.full_name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  function addMember(name: string) {
    setCcMembers((prev) => [...prev, name]);
    setMemberSearch("");
    setShowDropdown(false);
  }

  function removeMember(name: string) {
    setCcMembers((prev) => prev.filter((n) => n !== name));
  }

  async function handleSubmit() {
    if (isEdit && reservation) {
      updateMutation.mutate(
        {
          id: reservation.id,
          type,
          title: title || null,
          content: content || null,
          cc_members: ccMembers,
        },
        {
          onSuccess: (data) => {
            if (data?.warning) {
              toast.warning("시간이 겹치는 예약이 있습니다");
            } else {
              toast.success("예약이 수정되었습니다");
            }
            onClose();
          },
          onError: () => {
            toast.error("예약 수정에 실패했습니다");
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          room_id: effectiveRoomId,
          date,
          start_time: effectiveStart,
          end_time: effectiveEnd,
          type,
          title: title || undefined,
          content: content || undefined,
          cc_members: ccMembers.length > 0 ? ccMembers : undefined,
        },
        {
          onSuccess: (data) => {
            if (data?.warning) {
              toast.warning("시간이 겹치는 예약이 있습니다");
            } else {
              toast.success("예약이 등록되었습니다");
            }
            onClose();
          },
          onError: () => {
            toast.error("예약 등록에 실패했습니다");
          },
        }
      );
    }
  }

  function handleDelete() {
    if (!reservation) return;
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    deleteMutation.mutate(reservation.id, {
      onSuccess: () => {
        toast.success("예약이 삭제되었습니다");
        onClose();
      },
      onError: () => {
        toast.error("예약 삭제에 실패했습니다");
      },
    });
  }

  if (!open) return null;

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "예약 수정" : "회의실 예약"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Type toggle */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              유형
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("supervisor")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  type === "supervisor"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                감독관
              </button>
              <button
                type="button"
                onClick={() => setType("interview")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  type === "interview"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                면접교육
              </button>
            </div>
          </div>

          {/* Room (read-only) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              회의실
            </label>
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {room ? `${room.name} (${room.capacity}명)` : effectiveRoomId}
            </div>
          </div>

          {/* Time (read-only) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              시간
            </label>
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {effectiveStart} ~ {effectiveEnd}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예약 제목을 입력하세요"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* CC Members */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              참조자
            </label>
            {/* Selected tags */}
            {ccMembers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {ccMembers.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeMember(name)}
                      className="rounded-full p-0.5 hover:bg-blue-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Search input */}
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="이름으로 검색"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {showDropdown && filteredMembers.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => addMember(m.full_name)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  showDeleteConfirm
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "text-red-600 hover:bg-red-50"
                }`}
              >
                {showDeleteConfirm ? "정말 삭제" : "삭제"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "처리중..." : isEdit ? "수정" : "예약"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
