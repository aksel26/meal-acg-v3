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
      <div className="card-premium p-5 relative overflow-hidden">
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
      </div>
    </motion.div>
  );
}
