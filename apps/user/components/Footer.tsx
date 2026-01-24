"use client";

import Image from "next/image";
import React from "react";
import GithubIconSvg from "@/public/icons/github.png";
import { AtSign } from "@repo/ui/icons";
import { motion } from "motion/react";

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const handleEmailClick = () => {
    window.location.href = "mailto:hmkim@acghr.co.kr";
  };

  return (
    <footer className={`w-full mt-8 ${className}`}>
      <div className="card-premium mx-0 rounded-2xl overflow-hidden">
        <div className="p-6 space-y-5 relative">
          {/* Decorative gradient */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[oklch(0.92_0.05_250/0.3)] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

          {/* App Info */}
          <div className="text-center relative">
            <h3 className="text-sm font-semibold text-[oklch(0.25_0.02_250)] mb-1.5">
              ACG 식대관리 서비스
            </h3>
            <p className="text-xs text-[oklch(0.55_0.01_250)] leading-relaxed">
              간편한 식대관리, 점심조 편성, 음료취합을 위한 앱
            </p>
          </div>

          {/* Divider */}
          <div className="divider" />

          {/* Links */}
          <div className="flex justify-center items-center gap-4 relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.open("https://github.com/aksel26", "_blank")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[oklch(0.97_0.01_250)] hover:bg-[oklch(0.95_0.02_250)] transition-colors"
            >
              <Image src={GithubIconSvg} alt="GitHub" width={14} height={14} />
              <span className="text-xs text-[oklch(0.40_0.01_250)]">aksel26</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEmailClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[oklch(0.97_0.01_250)] hover:bg-[oklch(0.95_0.02_250)] transition-colors"
            >
              <AtSign size={14} className="text-[oklch(0.50_0.01_250)]" />
              <span className="text-xs text-[oklch(0.40_0.01_250)]">hmkim@acghr.co.kr</span>
            </motion.button>
          </div>

          {/* Copyright */}
          <div className="text-center pt-2 relative">
            <p className="text-[10px] text-[oklch(0.60_0.01_250)]">
              © {currentYear} ACG 식대관리 서비스. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
