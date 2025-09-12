"use client";

import { Alert, AlertTitle } from "@repo/ui/src/alert";
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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Alert className="mb-4 border-none bg-blue-50 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 hover:scale-102" onClick={checkNotice}>
        <AlertTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
              <div className="w-10 h-10 bg-white rounded-full relative">
                <motion.div
                  className="w-11 h-11 absolute left-0 -top-1"
                  animate={{
                    scale: [1, 1.15, 1],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    repeatDelay: 0.4,
                    ease: "easeInOut",
                  }}
                >
                  <Image src={Notice} alt="notice" />
                </motion.div>
              </div>
              <p className="text-sm text-blue-500">
                [공지] <br />
                식대앱이 업데이트 되었습니다! (v1.3)
              </p>
            </div>
            <ChevronRightIcon color="#2c7fff" />
          </div>
        </AlertTitle>
      </Alert>
    </motion.div>
  );
}