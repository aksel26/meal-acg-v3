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

export function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (id: string) => {
    if (id === "workDNA") {
      window.open("https://workdna.netlify.app/", "_blank");
      return;
    }

    router.push(`/${id}`);
  };

  const isActivePath = (id: string) => {
    if (id === "dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(`/${id}`);
  };

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.25 }}
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[820px] -translate-x-1/2 px-4 pb-4 sm:px-6"
    >
      <div className="glass-card-elevated rounded-[28px] px-2 py-2">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const isActive = isActivePath(item.id);

            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleNavigation(item.id)}
                className={`nav-item min-h-[64px] ${
                  isActive
                    ? "nav-item-active"
                    : "text-[var(--granite)]"
                }`}
              >
                <div
                  className={`mb-1.5 flex h-9 w-9 items-center justify-center rounded-full ${
                    isActive ? "bg-white/12" : "bg-[var(--whisper-cream)]"
                  }`}
                >
                  <Image
                    src={item.icon}
                    alt={item.label}
                    height={18}
                    width={18}
                    className={`transition-opacity duration-200 ${
                      isActive ? "opacity-100" : "opacity-70"
                    }`}
                  />
                </div>

                <span
                  className={`text-[10px] font-medium tracking-[0.08em] ${
                    isActive ? "text-white" : "text-[var(--slate-gray)]"
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
