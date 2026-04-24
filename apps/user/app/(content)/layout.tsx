"use client";

import React from "react";
import Header from "../components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
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

  return (
    <>
      <div
        className={`relative mx-auto min-h-dvh w-full px-4 pt-4 sm:px-6 ${
          isDashboard
            ? "max-w-[820px] pb-32 lg:max-w-[1280px] lg:pb-4"
            : "max-w-[820px] pb-32"
        }`}
      >
        <div className="fixed inset-0 gradient-mesh -z-20" />
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top,rgba(25,28,31,0.06),transparent_55%)]" />

        {!isDashboard && <Header />}

        <main className={`relative ${isDashboard ? "py-0" : "py-5"}`}>
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
              className={`relative z-10 pb-24 ${isDashboard ? "lg:pb-0" : ""}`}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <div className={isDashboard ? "lg:hidden" : ""}>
          <BottomNavigation />
        </div>
      </div>
      <PushNotificationPrompt />
    </>
  );
};

export default Layout;
