"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import React from "react";
import { motion } from "motion/react";
import HomeIcon from "@/public/icons/home.png";
import LunchIcon from "@/public/icons/lunch.png";
import MonthlyIcon from "@/public/icons/monthly.png";
import PointsIcon from "@/public/icons/payer.png";
import DNAIcon from "@/public/icons/dna.png";

export function BottomNavigation() {
  const navItems = [
    {
      id: "dashboard",
      label: "홈",
      icon: HomeIcon,
    },
    {
      id: "points",
      label: "복지포인트",
      icon: PointsIcon,
    },
    {
      id: "lunch",
      label: "점심조",
      icon: LunchIcon,
    },
    {
      id: "monthly",
      label: "먼쓸리",
      icon: MonthlyIcon,
    },
    {
      id: "workDNA",
      label: "유형검사",
      icon: DNAIcon,
    },
  ];

  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (id: string) => {
    if (id === "workDNA") {
      window.open("https://workdna.netlify.app/", "_blank");
    } else {
      router.push(`/${id}`);
    }
  };

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.3 }}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4 pb-2"
    >
      {/* Glass Background */}
      <div className="glass-card-elevated rounded-2xl px-2 py-1.5 shadow-xl">
        <div className="flex justify-around items-center pb-safe">
          {navItems.map((item) => {
            const isActive = pathname === `/${item.id}`;

            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleNavigation(item.id)}
                className="relative flex flex-col items-center justify-center py-2 px-3 rounded-xl"
              >
                {/* Active Background */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.94_0.05_250)] to-[oklch(0.91_0.07_270)] rounded-xl" />
                )}

                {/* Icon */}
                <motion.div
                  animate={
                    isActive ? { scale: 1.1, y: -1 } : { scale: 1, y: 0 }
                  }
                  transition={{ duration: 0.2 }}
                  className="relative z-10 mb-0.5"
                >
                  <Image
                    src={item.icon}
                    alt={item.label}
                    height={22}
                    width={22}
                    className={`transition-all duration-200 ${
                      isActive ? "drop-shadow-sm" : "opacity-70"
                    }`}
                  />
                </motion.div>

                {/* Label */}
                <span
                  className={`relative z-10 text-[10px] font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-[oklch(0.40_0.12_250)]"
                      : "text-[oklch(0.50_0.01_250)]"
                  }`}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Home Indicator Safe Area */}
      <div className="h-5" />
    </motion.nav>
  );
}
