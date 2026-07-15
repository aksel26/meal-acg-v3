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
      className="mb-6"
    >
      <motion.div
        onClick={checkNotice}
        className="notice-banner cursor-pointer relative overflow-hidden group"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            {/* Icon Container */}
            <div className="relative">
              <div className="w-11 h-11 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-sm">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 1.5,
                    ease: "easeInOut",
                  }}
                >
                  <Image src={Notice} alt="notice" width={28} height={28} />
                </motion.div>
              </div>
              {/* Notification dot */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[oklch(0.65_0.20_25)] rounded-full border-2 border-white shadow-sm" />
            </div>

            {/* Text Content */}
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-[oklch(0.55_0.11_250)] uppercase tracking-wider mb-0.5">
                공지사항
              </span>
              <p className="text-sm font-medium text-[oklch(0.35_0.11_250)]">
                식대앱이 업데이트 되었습니다! (v1.3)
              </p>
            </div>
          </div>

          {/* Arrow */}
          <motion.div
            className="text-[oklch(0.55_0.11_250)]"
            whileHover={{ x: 3 }}
          >
            <ChevronRightIcon size={20} />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
