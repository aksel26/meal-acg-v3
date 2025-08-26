"use client";

// import { AtSign } from "@repo/ui/icons";
import Image from "next/image";
import React from "react";
// import { AtSign } from "@repo/ui/icons";
import GithubIconSvg from "@/public/icons/github.svg";
import { AtSign } from "@repo/ui/icons";
interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const handleEmailClick = () => {
    window.location.href = "mailto:hmkim@acghr.co.kr";
  };
  return (
    <footer className={`w-full bg-gray-50 mt-6 ${className}`}>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* App Info Section */}
        <div className="text-center space-y-2">
          <h3 className="text-sm font-medium text-gray-900">ACG 식대관리 서비스</h3>
          <p className="text-xs text-gray-600">간편한 식대관리, 점심조 편성, 음료취합을 위한 앱</p>
        </div>

        {/* Links Section */}
        <div className="flex justify-center flex-col items-center space-y-1 text-xs">
          <button onClick={() => window.open("https://github.com/aksel26", "_blank")} className="text-gray-600 hover:text-gray-800 transition-colors p-1" aria-label="GitHub">
            <div className="flex space-x-1 items-center">
              <GithubIconSvg width={15} height={15} />
              <span>aksel26</span>
            </div>
          </button>
          <button onClick={handleEmailClick} className="text-gray-600 hover:text-gray-800 transition-colors p-1" aria-label="GitHub">
            <div className="flex space-x-1">
              <AtSign width={15} height={15} />
              <span>hmkim@acghr.co.kr</span>
            </div>
          </button>
        </div>

        {/* Copyright Section */}
        <div className="text-center pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">© {currentYear} ACG 식대관리 서비스. All rights reserved.</p>
        </div>

        {/* Bottom spacing to account for BottomNavigation */}
      </div>
    </footer>
  );
}
