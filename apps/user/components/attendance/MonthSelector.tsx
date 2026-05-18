"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@repo/ui/lib/utils";

interface MonthSelectorProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  className?: string;
}

export default function MonthSelector({
  year,
  month,
  onMonthChange,
  className,
}: MonthSelectorProps) {
  const handlePrev = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border border-[#f3f3f3] bg-white px-3 py-3",
        className,
      )}
    >
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePrev}
        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-[#f9f9fa]"
        aria-label="이전 달"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
      </motion.button>

      <h2 className="text-base font-semibold text-[#111111]">
        {year}년 {month}월
      </h2>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleNext}
        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-[#f9f9fa]"
        aria-label="다음 달"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
      </motion.button>
    </div>
  );
}
