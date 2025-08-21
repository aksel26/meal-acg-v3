"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import React from "react";
import { motion } from "motion/react";
import HomeIcon from "@/public/icons/home.png";
import LunchIcon from "@/public/icons/lunch.png";
import MonthlyIcon from "@/public/icons/monthly.png";
import DNAIon from "@/public/icons/dna.png";

export function BottomNavigation() {
  // 디버깅을 위한 로그
  // console.log("HomeIcon:", HomeIcon);
  // console.log("LunchIcon:", LunchIcon);
  // console.log("MonthlyIcon:", MonthlyIcon);

  const navItems = [
    {
      id: "dashboard",
      label: "홈",
      icon: <Image src={HomeIcon} alt="home" height={30} />,
    },
    {
      id: "lunch",
      label: "점심조",
      icon: <Image src={LunchIcon} alt="lunch" height={30} />,
    },
    {
      id: "monthly",
      label: "먼쓸리",
      icon: <Image src={MonthlyIcon} alt="monthly" height={30} />,
    },
    {
      id: "workDNA",
      label: "유형검사",
      icon: <Image src={DNAIon} alt="workDNA" height={30} />,
    },
  ];

  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 z-50 shadow-lg px-4 justify-between">
      <div className="flex justify-around items-center py-3">
        {navItems.map((item) => {
          const isActive = pathname === `/${item.id}`;
          // const IconComponent = item.icon;

          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (item.id === "workDNA") {
                  window.open("https://workdna.netlify.app/", "_blank");
                } else {
                  router.push(`/${item.id}`);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 w-1/4 rounded-lg transition-all duration-200 relative ${
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-blue-50 rounded-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              <motion.span 
                className="mb-1 relative z-10"
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {item.icon}
              </motion.span>
              <span className="text-xs font-medium relative z-10">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
