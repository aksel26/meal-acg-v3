"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { formatDateKorean } from "utils";
import { useUserStore } from "@/stores/userStore";
import { useAttendance, useCheckIn, useCheckOut } from "@/hooks/use-attendance";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import { useEffect } from "react";
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
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원");
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const todayStr = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
  const { data: attendance, isLoading } = useAttendance(memberId, todayStr);
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "좋은 아침이에요";
    if (hour < 18) return "안녕하세요";
    return "좋은 저녁이에요";
  };

  const handleCheckIn = () => {
    if (!memberId) return;
    checkInMutation.mutate(memberId);
  };

  const handleCheckOut = () => {
    if (!memberId) return;
    checkOutMutation.mutate(memberId);
  };

  const hasCheckedIn = !!attendance?.check_in_at;
  const hasCheckedOut = !!attendance?.check_out_at;
  const isMutating = checkInMutation.isPending || checkOutMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="mb-6"
    >
      <div className="card-premium rounded-2xl p-5 relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[oklch(0.88_0.10_250/0.4)] rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[oklch(0.90_0.08_200/0.3)] rounded-full blur-2xl" />

        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-semibold text-[oklch(0.20_0.02_250)]"
              >
                {getGreeting()}, {userName}님
              </motion.h1>
              <motion.div
                animate={{
                  rotate: [0, 14, -8, 14, -4, 10, 0],
                  transformOrigin: "70% 70%",
                }}
                transition={{
                  duration: 2.5,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              >
                <Image
                  src="/icons/greeting.png"
                  alt="greeting"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-[oklch(0.50_0.01_250)]"
            >
              오늘은{" "}
              <span className="font-medium text-[oklch(0.35_0.02_250)]">
                {formatDateKorean()}
              </span>{" "}
              입니다
            </motion.p>
          </div>

          {/* Date Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", bounce: 0.4 }}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.20_270)] text-white shadow-lg shadow-[oklch(0.55_0.18_250/0.3)]"
          >
            <span className="text-[10px] font-medium opacity-90 uppercase tracking-wide">
              {new Date().toLocaleDateString("ko-KR", { weekday: "short" })}
            </span>
            <span className="text-xl font-bold -mt-0.5">
              {new Date().getDate()}
            </span>
          </motion.div>
        </div>

        {/* 출퇴근 버튼 영역 */}
        {memberId && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative mt-4"
          >
            {!hasCheckedIn ? (
              /* 미출근: 출근 버튼 */
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCheckIn}
                disabled={isMutating}
                className="w-full py-3 rounded-xl font-semibold text-white text-[15px] bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.50_0.20_270)] shadow-md shadow-[oklch(0.55_0.18_250/0.25)] active:shadow-sm transition-shadow disabled:opacity-60"
              >
                {isMutating ? "처리 중..." : "출근하기"}
              </motion.button>
            ) : !hasCheckedOut ? (
              /* 출근 완료: 출근 시각 표시 + 퇴근 버튼 */
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-[oklch(0.96_0.02_150)] border border-[oklch(0.90_0.04_150)]">
                  <div className="w-2 h-2 rounded-full bg-[oklch(0.65_0.20_150)] animate-pulse" />
                  <span className="text-sm font-medium text-[oklch(0.35_0.06_150)]">
                    {formatTime(attendance!.check_in_at!)} 출근
                  </span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCheckOut}
                  disabled={isMutating}
                  className="px-5 py-3 rounded-xl font-semibold text-[14px] text-[oklch(0.40_0.02_250)] bg-[oklch(0.95_0.01_250)] border border-[oklch(0.88_0.02_250)] active:bg-[oklch(0.92_0.01_250)] transition-colors disabled:opacity-60"
                >
                  {isMutating ? "..." : "퇴근"}
                </motion.button>
              </div>
            ) : (
              /* 퇴근 완료: 출퇴근 시각 표시 */
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[oklch(0.97_0.01_250)] border border-[oklch(0.92_0.02_250)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <circle cx="8" cy="8" r="7" stroke="oklch(0.65 0.15 150)" strokeWidth="1.5" />
                  <path d="M5 8.5L7 10.5L11 6" stroke="oklch(0.65 0.15 150)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-[oklch(0.45_0.02_250)]">
                  <span className="font-medium">{formatTime(attendance!.check_in_at!)}</span>
                  {" 출근 → "}
                  <span className="font-medium">{formatTime(attendance!.check_out_at!)}</span>
                  {" 퇴근"}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
