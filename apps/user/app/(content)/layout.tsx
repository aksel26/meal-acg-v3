"use client";

import React from "react";
import Header from "../components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Sidebar, MobileSidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-dvh min-h-dvh overflow-hidden bg-white">
        {/* ── Sidebar (desktop only) ── */}
        <div className="max-md:hidden">
          <Sidebar />
        </div>

        {/* ── Mobile Sidebar (overlay) ── */}
        <div className="md:hidden">
          <MobileSidebar />
        </div>

        {/* ── Main Area ── */}
        <div className="flex min-h-0 flex-1 flex-col min-w-0">
          {/* Header */}
          <Header />

          {/* Content */}
          <main className="relative min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{
                    duration: 0.35,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative z-10 pb-28 md:pb-8"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Bottom Navigation (mobile only) */}
          <div className="md:hidden">
            <BottomNavigation />
          </div>
        </div>
      </div>
    </>
  );
};

export default Layout;
