"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@repo/ui/src/drawer";
import { Button } from "@repo/ui/src/button";
import { Textarea } from "@repo/ui/src/textarea";
import { Label } from "@repo/ui/src/label";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { useAttendanceModifyRequest } from "@/hooks/use-attendance-modify";

dayjs.locale("ko");

const ATTENDANCE_TYPES = ["근무", "휴가", "재택", "외근"] as const;

const TYPE_BADGE_STYLES: Record<string, string> = {
  근무: "bg-[oklch(0.93_0.04_250)] text-[oklch(0.45_0.12_250)] border-[oklch(0.85_0.08_250)]",
  휴가: "bg-[oklch(0.93_0.04_150)] text-[oklch(0.40_0.12_150)] border-[oklch(0.85_0.08_150)]",
  재택: "bg-[oklch(0.93_0.04_60)] text-[oklch(0.45_0.12_60)] border-[oklch(0.85_0.08_60)]",
  외근: "bg-[oklch(0.93_0.04_310)] text-[oklch(0.45_0.12_310)] border-[oklch(0.85_0.08_310)]",
};

interface AttendanceRecord {
  id: string;
  date: string;
  attendance_type: string;
}

interface AttendanceModifyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
  memberId: string;
}

export default function AttendanceModifyDrawer({
  open,
  onOpenChange,
  record,
  memberId,
}: AttendanceModifyDrawerProps) {
  const [requestedType, setRequestedType] = useState<string>("");
  const [reason, setReason] = useState("");

  const modifyMutation = useAttendanceModifyRequest();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && record) {
      setRequestedType("");
      setReason("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = () => {
    if (!record || !requestedType || !reason.trim()) return;

    modifyMutation.mutate(
      {
        attendanceRecordId: record.id,
        requesterId: memberId,
        originalType: record.attendance_type,
        requestedType,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!record) return null;

  const d = dayjs(record.date);
  const dateLabel = `${d.format("M월 D일")} (${d.format("dd")})`;
  const isValid = !!requestedType && requestedType !== record.attendance_type && reason.trim().length > 0;

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>근태 수정 요청</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-5">
          <div>
            <Label className="text-sm text-[oklch(0.50_0.01_250)]">
              대상 날짜
            </Label>
            <p className="mt-1 text-[oklch(0.25_0.02_250)] font-medium">
              {dateLabel}
            </p>
          </div>

          <div>
            <Label className="text-sm text-[oklch(0.50_0.01_250)]">
              현재 근태 유형
            </Label>
            <p className="mt-1">
              <span
                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${
                  TYPE_BADGE_STYLES[record.attendance_type] ||
                  TYPE_BADGE_STYLES["근무"]
                }`}
              >
                {record.attendance_type}
              </span>
            </p>
          </div>

          <div>
            <Label className="text-sm text-[oklch(0.50_0.01_250)] mb-2 block">
              변경할 근태 유형
            </Label>
            <div className="flex gap-2">
              {ATTENDANCE_TYPES.filter(
                (t) => t !== record.attendance_type
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => setRequestedType(type)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    requestedType === type
                      ? TYPE_BADGE_STYLES[type]
                      : "bg-[oklch(0.97_0.01_250)] text-[oklch(0.50_0.01_250)] border-transparent hover:bg-[oklch(0.95_0.01_250)]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label
              htmlFor="reason"
              className="text-sm text-[oklch(0.50_0.01_250)]"
            >
              사유
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="수정 사유를 입력해주세요"
              className="mt-1.5 min-h-[80px]"
            />
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || modifyMutation.isPending}
            className="w-full bg-[oklch(0.55_0.18_250)] hover:bg-[oklch(0.50_0.18_250)] text-white"
          >
            {modifyMutation.isPending ? "제출 중..." : "수정 요청"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              취소
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
