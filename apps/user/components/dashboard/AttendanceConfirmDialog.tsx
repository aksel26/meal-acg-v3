"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import { Textarea } from "@repo/ui/src/textarea";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface AttendanceConfirmDialogProps {
  mode: "check-in" | "check-out";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (earlyLeaveReason?: string) => void;
  isPending: boolean;
  checkInAt?: string | null;
}

export default function AttendanceConfirmDialog({
  mode,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  checkInAt,
}: AttendanceConfirmDialogProps) {
  const [now, setNow] = useState(() => dayjs().tz("Asia/Seoul"));
  const [reason, setReason] = useState("");

  // 실시간 시각 갱신
  useEffect(() => {
    if (!open) return;
    setNow(dayjs().tz("Asia/Seoul"));
    const timer = setInterval(() => {
      setNow(dayjs().tz("Asia/Seoul"));
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  // Dialog 닫힐 때 사유 초기화
  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const isCheckIn = mode === "check-in";

  // 출근 모드: 지각 판단 (10:00 이후)
  const isLate = isCheckIn && (now.hour() > 10 || (now.hour() === 10 && now.minute() > 0));

  // 퇴근 모드: 조기퇴근 판단
  const expectedOut = checkInAt ? dayjs(checkInAt).add(9, "hour") : null;
  const isEarlyLeave = !isCheckIn && expectedOut ? now.isBefore(expectedOut) : false;
  const remainingMinutes = isEarlyLeave && expectedOut ? expectedOut.diff(now, "minute") : 0;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  // 근무 시간 계산
  const workedMinutes = !isCheckIn && checkInAt ? now.diff(dayjs(checkInAt), "minute") : 0;
  const workedHours = Math.floor(workedMinutes / 60);
  const workedMins = workedMinutes % 60;

  const canConfirm = isCheckIn || !isEarlyLeave || reason.trim().length > 0;

  const handleConfirm = useCallback(() => {
    if (!canConfirm || isPending) return;
    onConfirm(isEarlyLeave ? reason.trim() : undefined);
  }, [canConfirm, isPending, onConfirm, isEarlyLeave, reason]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Textarea에서 Enter 시 줄바꿈 허용 (Shift+Enter 없이도)
        if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
        e.preventDefault();
        handleConfirm();
      }
    },
    [handleConfirm]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="text-center">
            {isCheckIn ? "출근 확인" : isEarlyLeave ? "조기퇴근 안내" : "퇴근 확인"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* 날짜 */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">날짜</span>
            <span className="font-medium text-slate-800">
              {now.format("YYYY년 M월 D일")} ({["일", "월", "화", "수", "목", "금", "토"][now.day()]})
            </span>
          </div>

          {/* 현재 시각 */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">현재 시각</span>
            <span className="font-medium text-slate-800 tabular-nums">
              {now.format("HH:mm:ss")}
            </span>
          </div>

          {/* 출근 모드: 근태 현황 */}
          {isCheckIn && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">근태 현황</span>
              {isLate ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  지각
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  정상출근
                </span>
              )}
            </div>
          )}

          {/* 퇴근 모드: 출근 시각 + 근무 시간 */}
          {!isCheckIn && checkInAt && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">출근 시각</span>
                <span className="font-medium text-slate-800">
                  {dayjs(checkInAt).tz("Asia/Seoul").format("HH:mm")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">근무 시간</span>
                <span className="font-medium text-slate-800">
                  {workedHours}시간 {workedMins}분
                </span>
              </div>
            </>
          )}

          {/* 조기퇴근 경고 */}
          {isEarlyLeave && (
            <div className="mt-2 space-y-3">
              <div className="p-3 rounded-xl bg-amber-50">
                <p className="text-sm font-medium text-amber-800">정규 퇴근시간까지 {remainingHours > 0 ? `${remainingHours}시간 ` : ""}{remainingMins}분 남았습니다.</p>
                <p className="mt-1 text-amber-600 text-xs">조기퇴근은 관리자 승인이 필요합니다.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  사유 입력 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="조기퇴근 사유를 입력해주세요"
                  className="min-h-20 text-sm"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 active:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#131313] active:bg-[#2a2a2a] transition-colors disabled:opacity-50"
          >
            {isPending
              ? "처리 중..."
              : isCheckIn
                ? "출근하기"
                : isEarlyLeave
                  ? "조기퇴근 신청"
                  : "퇴근하기"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
