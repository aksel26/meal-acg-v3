"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { formatDateKorean } from "utils";

interface GreetingSectionProps {
  userName: string;
}

export default function GreetingSection({ userName }: GreetingSectionProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "좋은 아침이에요";
    if (hour < 18) return "안녕하세요";
    return "좋은 저녁이에요";
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative overflow-hidden rounded-[24px] bg-[var(--lifted-cream)] px-6 py-7 shadow-[var(--shadow-elevated)]"
    >
      <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-[var(--whisper-cream)]" />

      <div className="relative flex items-start justify-between gap-5">
        <div className="max-w-[16rem] space-y-4">
          <p className="eyebrow-label">For You</p>
          <div className="space-y-2">
            <h1 className="text-[2rem] font-medium leading-[1.05] tracking-[-0.025em] text-[var(--ink-black)]">
              {getGreeting()},
              <br />
              {userName}님.
            </h1>
            <p className="text-sm leading-6 text-[var(--granite)]">
              오늘 식대 기록과 점심조 일정을 한 화면에서 가볍게 정리해보세요.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-[16px] border border-[rgba(20,20,19,0.08)] bg-white/80 px-4 py-2 text-sm text-[var(--granite)]">
            <span className="font-medium text-[var(--ink-black)]">{formatDateKorean()}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--light-signal-orange)]" />
            <span>오늘의 기록 시작</span>
          </div>
        </div>

        <div className="relative mr-2 mt-2 hidden shrink-0 sm:block">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[var(--ink-black)]">
            <Image
              src="/icons/greeting.png"
              alt="greeting"
              width={68}
              height={68}
              className="object-contain"
            />
          </div>
          <div className="absolute -bottom-1 -right-2 flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl text-[var(--ink-black)] shadow-[var(--shadow-sm)]">
            →
          </div>
        </div>
      </div>
    </motion.section>
  );
}
