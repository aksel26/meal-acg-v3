"use client";

import Image from "next/image";
import React from "react";
import LOGO from "@/public/images/ACG_LOGO_GRAY.png";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";
import { motion } from "motion/react";
import { Menu } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebarStore";

const Header = () => {
  const { isHeaderVisible } = useHeaderVisibility({
    threshold: 50,
    scrollDifference: 5,
  });
  const { open } = useSidebarStore();

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: isHeaderVisible ? 0 : -100 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="sticky top-0 px-4 pt-3"
    >
      <div className="glass-card-elevated rounded-2xl px-4 py-3 flex justify-between items-center">
        <button
          onClick={open}
          className="rounded-lg p-1 -ml-1 text-[oklch(0.45_0.01_250)] transition-colors hover:bg-black/5"
          aria-label="메뉴 열기"
        >
          <Menu size={22} />
        </button>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Image
            src={LOGO}
            alt="ACG Logo"
            width={48}
            height={16}
            className="opacity-70 hover:opacity-100 transition-opacity duration-200"
          />
        </motion.div>
        {/* Spacer for centering logo */}
        <div className="w-[30px]" />
      </div>
    </motion.header>
  );
};

export default Header;
