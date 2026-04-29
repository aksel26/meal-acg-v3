"use client";

import { ChevronRight as ChevronRightIcon } from "@repo/ui/icons";
import { motion } from "motion/react";
import Image from "next/image";
import Notice from "@/public/images/Notice.png";

interface NoticeSectionProps {
  variant?: "card" | "icon";
}

export default function NoticeSection({ variant = "card" }: NoticeSectionProps) {
  const checkNotice = () => {
    window.open("https://aksel26.notion.site/v1-3-25dc8e16fda88016a7b0cf0d12bcbc80?pvs=74", "_blank");
  };

  if (variant === "icon") {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.45,
          delay: 0.15,
          ease: [0.16, 1, 0.3, 1],
        }}
        onClick={checkNotice}
        aria-label="공지 보기"
        className="group flex h-full min-h-[64px] w-full cursor-pointer items-center justify-center rounded-[20px] bg-white transition-colors duration-200 hover:bg-[var(--whisper-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-black)] focus-visible:ring-offset-2 lg:min-h-0"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-[13px] bg-[var(--whisper-cream)] transition-colors duration-200 group-hover:bg-white">
          <Image src={Notice} alt="" width={20} height={20} aria-hidden="true" />
          <span className="absolute -right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--ink-black)]" />
        </span>
      </motion.button>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="h-full rounded-[24px] bg-white p-5"
    >
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[var(--whisper-cream)]">
            <Image src={Notice} alt="notice" width={26} height={26} />
            <span className="absolute -right-0.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-[var(--ink-black)]" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--slate-gray)]">
              Notice
            </p>
            <h2 className="mt-2 text-base font-medium text-[var(--ink-black)]">
              식대앱 업데이트 안내
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--granite)]">
              최신 변경사항과 운영 공지를 확인하세요.
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={checkNotice}
          className="flex w-full items-center justify-between rounded-full bg-[var(--ink-black)] px-4 py-3 text-left text-sm font-medium text-white transition-opacity hover:opacity-85"
          whileTap={{ scale: 0.99 }}
        >
          공지 보기
          <ChevronRightIcon size={18} />
        </motion.button>
      </div>
    </motion.section>
  );
}
