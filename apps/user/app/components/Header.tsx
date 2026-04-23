"use client";

import React from "react";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";
import { motion } from "motion/react";

const Header = () => {
  const { isHeaderVisible } = useHeaderVisibility({
    threshold: 50,
    scrollDifference: 5,
  });

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: isHeaderVisible ? 0 : -100 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="sticky top-0 z-40 pt-3"
    >
      <div className="glass-card-elevated flex items-center justify-between gap-4 rounded-[18px] px-5 py-3">
        <div className="text-sm font-medium tracking-[var(--tracking-ui-ko)] text-[var(--ink-black)]">
          오늘의 식대 기록
        </div>

        <div className="flex items-center gap-2 rounded-[14px] border border-[rgba(20,20,19,0.08)] bg-[var(--lifted-cream)] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[var(--signal-orange)]" />
          <span className="text-xs font-medium text-[var(--granite)]">
            식대관리
          </span>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
