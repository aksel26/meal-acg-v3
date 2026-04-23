"use client";

import Image from "next/image";
import React from "react";
import LOGO from "@/public/images/ACG_LOGO_GRAY.png";
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
      <div className="glass-card-elevated flex items-center justify-between gap-4 rounded-[999px] px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--canvas-cream)]">
            <Image
              src={LOGO}
              alt="ACG Logo"
              width={42}
              height={14}
              className="opacity-80"
            />
          </div>
          <div className="min-w-0">
            <p className="eyebrow-label text-[11px]">User App</p>
            <p className="truncate text-sm font-medium tracking-[-0.02em] text-[var(--ink-black)]">
              ACG Meal Companion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-[rgba(20,20,19,0.08)] bg-[var(--lifted-cream)] px-3 py-2">
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
