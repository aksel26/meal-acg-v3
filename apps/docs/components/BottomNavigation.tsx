"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import React from "react";
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
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "workDNA") {
                  window.open("https://workdna.netlify.app/", "_blank");
                } else {
                  router.push(`/${item.id}`);
                }
              }}
              className={`flex flex-col items-center justify-center  py-1 w-1/4 rounded-lg transition-all duration-200 ${
                isActive ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
