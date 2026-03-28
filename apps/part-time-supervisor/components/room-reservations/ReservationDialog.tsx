"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Textarea } from "@repo/ui/src/textarea";
import { Label } from "@repo/ui/src/label";
import { Badge } from "@repo/ui/src/badge";
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
  roomId?: string;
  startTime?: string;
  endTime?: string;
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
          onError: () => toast.error("예약 수정에 실패했습니다"),
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
          onError: () => toast.error("예약 등록에 실패했습니다"),
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
      onError: () => toast.error("예약 삭제에 실패했습니다"),
    });
  }

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "예약 수정" : "회의실 예약"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 유형 */}
          <div className="space-y-1.5">
            <Label>유형</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "supervisor" ? "default" : "outline"}
                className={`flex-1 ${type === "supervisor" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                onClick={() => setType("supervisor")}
              >
                감독관
              </Button>
              <Button
                type="button"
                variant={type === "interview" ? "default" : "outline"}
                className={`flex-1 ${type === "interview" ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                onClick={() => setType("interview")}
              >
                면접교육
              </Button>
            </div>
          </div>

          {/* 회의실 + 시간 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>회의실</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {room ? `${room.name} (${room.capacity}명)` : effectiveRoomId}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>시작</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {effectiveStart}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>종료</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {effectiveEnd}
              </div>
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-1.5">
            <Label>제목</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예약 제목을 입력하세요"
            />
          </div>

          {/* 참조자 */}
          <div className="space-y-1.5">
            <Label>참조자</Label>
            {ccMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ccMembers.map((name) => (
                  <Badge key={name} variant="secondary" className="gap-1 pr-1">
                    {name}
                    <button
                      type="button"
                      onClick={() => removeMember(name)}
                      className="rounded-full p-0.5 hover:bg-accent"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="relative">
              <Input
                ref={searchRef}
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="이름으로 검색"
              />
              {showDropdown && filteredMembers.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md"
                >
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => addMember(m.full_name)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 내용 */}
          <div className="space-y-1.5">
            <Label>내용</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {isEdit && (
              <Button
                type="button"
                variant={showDeleteConfirm ? "destructive" : "ghost"}
                onClick={handleDelete}
                disabled={isPending}
              >
                {showDeleteConfirm ? "정말 삭제" : "삭제"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? "처리중..." : isEdit ? "수정" : "예약"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
