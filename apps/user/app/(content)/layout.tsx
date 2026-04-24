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
