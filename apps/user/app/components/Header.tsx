"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";

const sectionLabels = [
  { matcher: (pathname: string) => pathname.startsWith("/points-dashboard"), label: "Points Dashboard" },
  { matcher: (pathname: string) => pathname.startsWith("/points"), label: "복지포인트" },
  { matcher: (pathname: string) => pathname.startsWith("/monthly"), label: "음료취합" },
  { matcher: (pathname: string) => pathname.startsWith("/lunch"), label: "점심조" },
  { matcher: (pathname: string) => pathname.startsWith("/dashboard"), label: "Dashboard" },
];

const Header = () => {
  const pathname = usePathname();
  const { isHeaderVisible } = useHeaderVisibility({
    threshold: 50,
    scrollDifference: 5,
  });

  const currentLabel =
    sectionLabels.find(({ matcher }) => matcher(pathname))?.label ?? "User App";

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: isHeaderVisible ? 0 : -110 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="sticky top-0 z-40 pt-2"
    >
      <div className="glass-card-elevated flex items-center justify-between gap-4 rounded-[24px] px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow-label">ACG welfare</p>
          <p className="mt-2 truncate font-display text-[1.375rem] leading-none tracking-[-0.035em] text-[var(--ink-black)]">
            {currentLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--ink-black)] px-4 py-2 text-xs font-medium text-white">
          <span className="h-2 w-2 rounded-full bg-[var(--teal)]" />
          운영중
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
