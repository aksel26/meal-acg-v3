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
    <footer className={`w-full ${className}`}>
      <div className="overflow-hidden rounded-[24px] bg-[var(--ink-black)] text-white shadow-[var(--shadow-elevated)]">
        <div className="space-y-6 px-6 py-8">
          <div className="space-y-3">
            <p className="eyebrow-label text-[rgba(255,255,255,0.72)] before:bg-[var(--light-signal-orange)]">
              Support
            </p>
            <h2 className="max-w-[16rem] text-[1.8rem] font-medium leading-[1.05] tracking-[-0.03em]">
              식대 관리가 필요한 순간에 바로 닿는 안내와 지원.
            </h2>
            <p className="max-w-[18rem] text-sm leading-6 text-[rgba(255,255,255,0.68)]">
              식대 기록, 점심조 편성, 음료 취합까지 user 앱 안에서 같은 톤으로 이어집니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open("https://github.com/aksel26", "_blank")}
              className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-left transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <Image src={GithubIconSvg} alt="GitHub" width={16} height={16} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[rgba(255,255,255,0.45)]">
                    Github
                  </p>
                  <p className="text-sm font-medium">aksel26</p>
                </div>
              </div>
              <span className="text-lg text-[rgba(255,255,255,0.7)]">↗</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleEmailClick}
              className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-left transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <AtSign size={16} className="text-[var(--canvas-cream)]" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[rgba(255,255,255,0.45)]">
                    Email
                  </p>
                  <p className="text-sm font-medium">hmkim@acghr.co.kr</p>
                </div>
              </div>
              <span className="text-lg text-[rgba(255,255,255,0.7)]">↗</span>
            </motion.button>
          </div>

          <div className="divider" />

          <div className="flex items-center justify-between gap-4 text-xs text-[rgba(255,255,255,0.58)]">
            <span>© {currentYear} ACG Meal Service</span>
            <span className="rounded-[14px] border border-white/12 px-3 py-1.5 text-[rgba(255,255,255,0.72)]">
              KO • User App
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
