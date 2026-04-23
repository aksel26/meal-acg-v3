"use client";

import { ChevronRight as ChevronRightIcon } from "@repo/ui/icons";
import { motion } from "motion/react";
import Image from "next/image";
import Notice from "@/public/images/Notice.png";

export default function NoticeSection() {
  const checkNotice = () => {
    window.open("https://aksel26.notion.site/v1-3-25dc8e16fda88016a7b0cf0d12bcbc80?pvs=74", "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.2,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <motion.button
        type="button"
        onClick={checkNotice}
        className="notice-banner group relative flex w-full items-center justify-between gap-4 overflow-hidden text-left"
        whileTap={{ scale: 0.99 }}
      >
        <div className="absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full border border-[rgba(243,115,56,0.32)]" />
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--soft-bone)]">
            <Image src={Notice} alt="notice" width={28} height={28} />
            <span className="absolute -right-0.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-[var(--signal-orange)]" />
          </div>
          <div className="min-w-0">
            <span className="eyebrow-label text-[11px]">Notice</span>
            <p className="mt-1 truncate text-sm font-medium text-[var(--ink-black)]">
              식대앱이 업데이트 되었습니다! (v1.3)
            </p>
          </div>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[var(--ink-black)] shadow-[var(--shadow-sm)] transition-transform group-hover:translate-x-0.5">
          <ChevronRightIcon size={20} />
        </div>
      </motion.button>
    </motion.div>
  );
}
