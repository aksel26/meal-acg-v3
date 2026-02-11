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
      className="sticky top-0 px-4 pt-3"
    >
      <div className="glass-card-elevated rounded-2xl px-5 py-3 flex justify-center items-center shadow-sm">
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
      </div>
    </motion.header>
  );
};

export default Header;
