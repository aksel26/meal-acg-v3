"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface MonthSelectorProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

export default function MonthSelector({
  year,
  month,
  onMonthChange,
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
    <div className="flex items-center justify-between">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePrev}
        className="p-2 rounded-xl hover:bg-[oklch(0.95_0.01_250)] transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-[oklch(0.45_0.02_250)]" />
      </motion.button>

      <h2 className="text-lg font-semibold text-[oklch(0.25_0.02_250)]">
        {year}년 {month}월
      </h2>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleNext}
        className="p-2 rounded-xl hover:bg-[oklch(0.95_0.01_250)] transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-[oklch(0.45_0.02_250)]" />
      </motion.button>
    </div>
  );
}
