"use client";

import React from "react";
import Header from "../components/Header";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const PushNotificationPrompt = dynamic(
  () => import("@/components/PushNotificationPrompt"),
  { ssr: false },
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const isMonthly = pathname.startsWith("/monthly");
  const usesWideDesktopLayout =
    isDashboard ||
    pathname.startsWith("/points") ||
    isMonthly ||
    pathname.startsWith("/lunch");

  return (
    <>
      <div
        className={`relative mx-auto w-full px-4 pt-4 sm:px-6 ${
          isMonthly
            ? "monthly-layout-frame flex h-dvh flex-col overflow-hidden"
            : "min-h-dvh"
        } ${
          usesWideDesktopLayout
            ? "max-w-[820px] pb-6 lg:max-w-[1280px] lg:pb-4"
            : "max-w-[820px] pb-6"
        }`}
      >
        <div className="fixed inset-0 gradient-mesh -z-20" />

        {!isDashboard && <Header />}

        <main
          className={`relative ${
            isDashboard
              ? "py-0"
              : isMonthly
                ? "monthly-layout-main min-h-0 flex-1 py-3"
                : "py-5"
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`relative z-10 ${isMonthly ? "monthly-layout-motion h-full min-h-0" : ""}`}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <PushNotificationPrompt />
    </>
  );
};

export default Layout;
