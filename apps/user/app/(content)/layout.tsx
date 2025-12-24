"use client";

import React from "react";
import Header from "../components/Header";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import Snowfall from "react-snowfall";

const layout = ({ children }: { children: React.ReactNode }) => {
  const [images, setImages] = React.useState<HTMLImageElement[]>([]);

  React.useEffect(() => {
    const snowflake1 = document.createElement("img");
    snowflake1.onload = () => {
      setImages([snowflake1]);
    };
    snowflake1.onerror = () => {
      console.error(
        "이미지 로드 실패: /images/snowflake.png 경로를 확인해주세요."
      );
    };
    snowflake1.src = "/images/snowflake.png";
  }, []);

  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-100 max-w-lg mx-auto">
      {/* 헤더 */}
      <Header />

      <main className="container mx-auto px-4 py-6">
        <Snowfall
          snowflakeCount={100}
          speed={[0.5, 2]}
          // wind={[-0.5, 0.5]}
          radius={[5, 15]}
          images={images}
          // opacity={[0.2, 0.3]}
          // rotationSpeed={[-2, 2]}
          style={{
            position: "fixed",
            width: "100vw",
            height: "100vh",
          }}
        />
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
