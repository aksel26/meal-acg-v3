"use client";

import React from "react";
import Header from "../components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Sidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const PushNotificationPrompt = dynamic(
  () => import("@/components/PushNotificationPrompt"),
  { ssr: false },
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <>
      <div className="flex min-h-screen bg-[#f5f5f7]">
        {/* ── Sidebar (desktop only) ── */}
        <div className="max-md:hidden">
          <Sidebar />
        </div>

        {/* ── Main Area ── */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Header (mobile only) */}
          <div className="md:hidden">
            <Header />
          </div>

          {/* Content */}
          <main className="relative flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-2xl">
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
      <PushNotificationPrompt />
    </>
  );
};

export default Layout;
