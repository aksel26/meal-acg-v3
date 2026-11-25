"use client";

import React from "react";
import Header from "../components/Header";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import QuickActionsSection from "@/components/dashboard/QuickActionsSection";

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
  // 하단 바로가기 메뉴를 보여 주는 화면 (포인트 대시보드는 제외)
  const showsQuickActions =
    isDashboard ||
    isMonthly ||
    pathname === "/points" ||
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
            {/* 화면 전환은 투명도만 바꾼다. transform을 쓰면 안쪽 fixed 요소의 기준이 화면 대신 이 요소가 된다 */}
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeOut" } }}
              transition={{
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`relative z-10 ${isMonthly ? "monthly-layout-motion h-full min-h-0" : ""}`}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* 모바일·태블릿 하단 고정 메뉴는 화면 전환 밖에서 한 번만 그린다. 데스크톱(lg)은 각 화면 안에 배치 */}
        {showsQuickActions && (
          <div className="mobile-nav-footer fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[820px] px-4 sm:px-6 lg:hidden">
            <QuickActionsSection />
          </div>
        )}
      </div>
      <PushNotificationPrompt />
    </>
  );
};

export default Layout;
