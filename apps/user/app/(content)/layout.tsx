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

const PixelSnow = dynamic(() => import("@/components/PixelSnow/PixelSnow"), {
  ssr: false,
});

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

        {/* 전 화면 눈 효과: 카드(z-10) 앞, 헤더(z-40)·하단 메뉴·Dialog(z-50) 뒤. 클릭은 통과한다 */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30">
          <PixelSnow
            color="#c3ecff"
            variant="snowflake"
            density={0.5}
            speed={1}
            wind={0.25}
            flakeSize={0.25}
            pixelSize={2}
            glow={0.8}
            mouseInteraction
            sway={0.5}
            twinkle={0.6}
            accumulate
            depth={0.6}
            brightness={1}
            fade={0.35}
            opacity={1}
            intro
            lightMode
          />
        </div>

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
