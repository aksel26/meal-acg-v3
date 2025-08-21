"use client";

import React from "react";
import Header from "./page";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";

const layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-100 max-w-lg mx-auto">
      {/* 헤더 */}
      <Header />

      <main className="container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="pb-24"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default layout;
