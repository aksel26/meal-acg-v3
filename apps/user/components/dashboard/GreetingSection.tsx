"use client";

import { motion } from "motion/react";
import { useUserStore } from "@/stores/userStore";
import { useAttendance, useCheckIn, useCheckOut } from "@/hooks/use-attendance";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import { useState, useEffect } from "react";
import AttendanceConfirmDialog from "./AttendanceConfirmDialog";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

interface GreetingSectionProps {
  userName: string;
}

function formatTime(isoString: string) {
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm");
}

export default function GreetingSection({ userName }: GreetingSectionProps) {
  const { memberId, setMemberInfo } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원", memberLookup.hire_date);
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const todayStr = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
  const { data: attendance, isLoading } = useAttendance(memberId, todayStr);
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);

  const handleCheckIn = () => {
    if (!memberId) return;
    checkInMutation.mutate(memberId, {
      onSuccess: () => setCheckInDialogOpen(false),
    });
  };

  const handleCheckOut = (earlyLeaveReason?: string) => {
    if (!memberId) return;
    checkOutMutation.mutate(
      { memberId, earlyLeaveReason },
      { onSuccess: () => setCheckOutDialogOpen(false) }
    );
  };

  const hasCheckedIn = !!attendance?.check_in_at;
  const hasCheckedOut = !!attendance?.check_out_at;
  const isMutating = checkInMutation.isPending || checkOutMutation.isPending;

  if (!memberId || isLoading) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <div className="rounded-2xl bg-slate-50 p-5">
          {!hasCheckedIn ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setCheckInDialogOpen(true)}
              disabled={isMutating}
              className="w-full py-3 rounded-xl font-semibold text-slate-700 text-[15px] bg-blue-50 active:bg-blue-100 transition-colors disabled:opacity-60"
            >
              출근하기
            </motion.button>
          ) : !hasCheckedOut ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50">
                <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-sm font-medium text-slate-600">
                  {formatTime(attendance!.check_in_at!)} 출근
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setCheckOutDialogOpen(true)}
                disabled={isMutating}
                className="px-5 py-3 rounded-xl font-semibold text-[14px] text-slate-600 bg-slate-100 active:bg-slate-200 transition-colors disabled:opacity-60"
              >
                퇴근
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <circle cx="8" cy="8" r="7" stroke="#94a3b8" strokeWidth="1.5" />
                <path d="M5 8.5L7 10.5L11 6" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm text-slate-600">
                <span className="font-medium">{formatTime(attendance!.check_in_at!)}</span>
                {" 출근 → "}
                <span className="font-medium">{formatTime(attendance!.check_out_at!)}</span>
                {" 퇴근"}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      <AttendanceConfirmDialog
        mode="check-in"
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        onConfirm={handleCheckIn}
        isPending={checkInMutation.isPending}
      />
      <AttendanceConfirmDialog
        mode="check-out"
        open={checkOutDialogOpen}
        onOpenChange={setCheckOutDialogOpen}
        onConfirm={handleCheckOut}
        isPending={checkOutMutation.isPending}
        checkInAt={attendance?.check_in_at}
      />
    </>
  );
}
