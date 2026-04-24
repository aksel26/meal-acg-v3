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
      <div className="glass-card-elevated flex items-center justify-between gap-4 rounded-[20px] px-5 py-3">
        <div className="text-sm font-semibold tracking-[var(--tracking-ui-ko)] text-[var(--ink-black)]">
          ACG meal welfare
        </div>

        <div className="flex items-center gap-2 rounded-[9999px] bg-[rgba(22,51,0,0.08)] px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-[var(--signal-orange)]" />
          <span className="text-xs font-semibold text-[var(--granite)]">
            식대관리
          </span>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
