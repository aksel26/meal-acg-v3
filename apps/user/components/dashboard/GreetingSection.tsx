"use client";

import { motion } from "motion/react";

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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="rounded-[20px] bg-white px-4 py-3 sm:px-5 lg:flex lg:items-center lg:px-3 lg:py-2"
    >
      <div className="min-w-0">
        <h1 className="truncate font-display text-lg font-medium leading-tight text-[var(--ink-black)] lg:text-sm">
          {getGreeting()}, {userName}님
        </h1>
      </div>
    </motion.section>
  );
}
