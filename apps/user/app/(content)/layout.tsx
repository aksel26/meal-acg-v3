"use client";

import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
const Snowfall = dynamic(() => import("react-snowfall"), { ssr: false });
const PushNotificationPrompt = dynamic(
  () => import("@/components/PushNotificationPrompt"),
  { ssr: false },
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const snowflake1 = document.createElement("img");
    snowflake1.onload = () => {
      setImages([snowflake1]);
    };
    snowflake1.onerror = () => {
      console.error("이미지 로드 실패: /images/snowflake.png 경로를 확인해주세요.");
    };
    snowflake1.src = "/images/snowflake.png";
  }, []);

  return (
    <>
      <div className="min-h-screen max-w-lg mx-auto relative">
        {/* Background Gradient Mesh */}
        <div className="fixed inset-0 gradient-mesh -z-10" />

        {/* Decorative Background Blobs */}
        <div className="fixed top-20 right-0 w-64 h-64 bg-[oklch(0.88_0.10_280/0.2)] rounded-full blur-3xl -z-10" />
        <div className="fixed top-1/2 left-0 w-48 h-48 bg-[oklch(0.90_0.08_220/0.15)] rounded-full blur-3xl -z-10" />
        <div className="fixed bottom-40 right-0 w-56 h-56 bg-[oklch(0.92_0.06_50/0.15)] rounded-full blur-3xl -z-10" />

        {/* Header */}
        <Header />

      {/* Main Content */}
      <main className="relative px-4 py-6">
        {/* Snowfall Effect */}
        <Snowfall
          snowflakeCount={25}
          speed={[0.5, 1.5]}
          radius={[4, 12]}
          images={images}
          style={{
            position: "fixed",
            width: "100vw",
            height: "100vh",
            zIndex: 1,
            pointerEvents: "none",
            opacity: 0.7,
          }}
        />

        {/* Page Content with Transitions */}
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
            className="relative z-10 pb-28"
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
