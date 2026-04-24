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
      label: "음료취합",
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
      transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.3 }}
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 px-4 pb-4"
    >
      <div className="glass-card-elevated rounded-[20px] px-2 py-2 shadow-[var(--shadow-float)]">
        <div className="flex items-center justify-around pb-safe">
          {navItems.map((item) => {
            const isActive = pathname === `/${item.id}`;

            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation(item.id)}
                className={`relative flex min-w-[60px] flex-col items-center justify-center rounded-[14px] px-3 py-2 transition-colors ${
                  isActive
                    ? "bg-[var(--signal-orange)] text-[var(--charcoal)]"
                    : "text-[var(--granite)]"
                }`}
              >
                <motion.div
                  animate={isActive ? { scale: 1.04, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative z-10 mb-1"
                >
                  <Image
                    src={item.icon}
                    alt={item.label}
                    height={20}
                    width={20}
                  className={`transition-opacity duration-200 ${
                    isActive ? "opacity-100" : "opacity-65"
                  }`}
                />
                </motion.div>

                <span
                  className={`relative z-10 text-[10px] font-medium tracking-[-0.02em] ${
                    isActive ? "text-[var(--charcoal)]" : "text-[var(--slate-gray)]"
                  }`}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
