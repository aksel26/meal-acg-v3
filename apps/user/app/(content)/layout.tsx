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

  return (
    <>
      <div className="relative mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
        <div className="fixed inset-0 gradient-mesh -z-10" />
        <div className="orbit-line fixed -left-14 top-24 h-72 w-72 -z-10 opacity-70" />
        <div className="orbit-line fixed right-[-6rem] top-[26rem] h-64 w-64 -z-10 opacity-55" />
        <div className="orbit-dot fixed left-8 top-40 -z-10" />
        <div className="orbit-dot fixed right-10 top-[34rem] -z-10" />

        <Header />

        <main className="relative py-6">
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
              className="relative z-10 pb-24"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <BottomNavigation />
      </div>
      <PushNotificationPrompt />
    </>
  );
};

export default Layout;
