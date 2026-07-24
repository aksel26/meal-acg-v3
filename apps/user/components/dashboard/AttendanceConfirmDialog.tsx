"use client";

import { useState, useEffect, useCallback } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import { Textarea } from "@repo/ui/src/textarea";
import { CalendarDays, Clock3, TimerReset } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getCheckInStatus } from "@/lib/attendance-status";

dayjs.extend(utc);
dayjs.extend(timezone);

interface AttendanceConfirmDialogProps {
  mode: "check-in" | "check-out";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (earlyLeaveReason?: string) => void;
  isPending: boolean;
  checkInAt?: string | null;
  birthDate?: string | null;
}

export default function AttendanceConfirmDialog({
  mode,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  checkInAt,
  birthDate,
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

  // 출근 모드: 08:00 이전 조기출근, 08:00~10:00 정상출근, 10:00 이후 지각
  const checkInStatus = isCheckIn
    ? getCheckInStatus(now.hour(), now.minute(), now.second())
    : null;
  const isEarlyCheckIn = checkInStatus === "early_check_in";
  const isLate = checkInStatus === "late";

  // 퇴근 모드: 조기퇴근 판단
  const isBirthday =
    !isCheckIn &&
    !!checkInAt &&
    !!birthDate &&
    dayjs(checkInAt).tz("Asia/Seoul").format("MM-DD") ===
      dayjs(birthDate).format("MM-DD");
  const expectedOut = checkInAt
    ? dayjs(checkInAt).add(isBirthday ? 7 : 9, "hour")
    : null;
  const isEarlyLeave =
    !isCheckIn && expectedOut ? now.isBefore(expectedOut) : false;
  const remainingMinutes =
    isEarlyLeave && expectedOut ? expectedOut.diff(now, "minute") : 0;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  // 근무 시간 계산
  const workedMinutes =
    !isCheckIn && checkInAt ? now.diff(dayjs(checkInAt), "minute") : 0;
  const workedHours = Math.floor(workedMinutes / 60);
  const workedMins = workedMinutes % 60;

  const canConfirm = isCheckIn || !isEarlyLeave || reason.trim().length > 0;

  const handleConfirm = useCallback(() => {
    if (!canConfirm || isPending) return;
    onConfirm(isEarlyLeave ? reason.trim() : undefined);
  }, [canConfirm, isPending, onConfirm, isEarlyLeave, reason]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Textarea에서 Enter 시 줄바꿈 허용 (Shift+Enter 없이도)
        if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
        e.preventDefault();
        handleConfirm();
      }
    },
    [handleConfirm],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[420px] overflow-hidden rounded-2xl p-0"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="px-5 pb-3 pt-5 text-left">
          <DialogTitle className="text-lg font-semibold text-[#111111]">
            {isCheckIn
              ? "출근 확인"
              : isEarlyLeave
                ? "조기퇴근 안내"
                : "퇴근 확인"}
          </DialogTitle>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            {isCheckIn
              ? "현재 시각 기준으로 출근을 기록합니다."
              : isEarlyLeave
                ? "정규 퇴근시간 전 퇴근은 승인 요청으로 등록됩니다."
                : isBirthday
                  ? "생일 혜택으로 정규 퇴근보다 2시간 일찍 퇴근할 수 있습니다."
                  : "오늘의 퇴근 시간을 기록합니다."}
          </p>
        </DialogHeader>

        <div className="space-y-4 px-5 pb-4">
          {/* 날짜 */}
          <div className="grid gap-2 rounded-xl bg-slate-50 p-3">
            <InfoRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="날짜"
              value={`${now.format("YYYY년 M월 D일")} (${["일", "월", "화", "수", "목", "금", "토"][now.day()]})`}
            />
            <InfoRow
              icon={<Clock3 className="h-4 w-4" />}
              label="현재 시각"
              value={now.format("HH:mm:ss")}
              tabular
            />
          </div>

          {/* 출근 모드: 근태 현황 */}
          {isCheckIn && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">근태 현황</span>
              {isEarlyCheckIn ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  조기출근
                </span>
              ) : isLate ? (
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
            <div className="grid grid-cols-2 gap-2">
              <MetricBox
                label="출근 시각"
                value={dayjs(checkInAt).tz("Asia/Seoul").format("HH:mm")}
              />
              <MetricBox
                label="근무 시간"
                value={`${workedHours}시간 ${workedMins}분`}
              />
            </div>
          )}

          {/* 조기퇴근 경고 */}
          {isEarlyLeave && (
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-900">
                <div className="flex items-start gap-2.5">
                  <TimerReset className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold">
                      정규 퇴근시간까지{" "}
                      {remainingHours > 0 ? `${remainingHours}시간 ` : ""}
                      {remainingMins}분 남았습니다.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      사유를 입력하면 조기퇴근 승인 요청이 함께 등록됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>
                    사유 입력 <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    {reason.trim().length}/200
                  </span>
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 200))}
                  placeholder="예: 병원 진료로 인해 조기퇴근 신청합니다."
                  className="min-h-24 resize-none rounded-xl bg-slate-50 text-sm focus:bg-white"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 cursor-pointer rounded-lg bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 active:bg-slate-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isPending}
            className="flex-1 cursor-pointer rounded-lg bg-[#131313] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a2a2a] active:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
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

function InfoRow({
  icon,
  label,
  value,
  tabular = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tabular?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="inline-flex items-center gap-2 text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </span>
      <span
        className={`font-medium text-slate-800 ${
          tabular ? "tabular-nums" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
