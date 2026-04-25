"use client";

import Image from "next/image";
import React from "react";
import GithubIconSvg from "@/public/icons/github.png";
import { AtSign } from "@repo/ui/icons";
import { motion } from "motion/react";

interface FooterProps {
  className?: string;
  variant?: "default" | "compact";
}

export function Footer({ className = "", variant = "default" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const handleEmailClick = () => {
    window.location.href = "mailto:hmkim@acghr.co.kr";
  };

  if (variant === "compact") {
    return (
      <footer className={`w-full ${className}`}>
        <div className="flex flex-col gap-3 rounded-[22px] bg-white px-4 py-3 text-[var(--ink-black)] sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--slate-gray)]">
              Support
            </p>
            <p className="mt-1 truncate text-sm text-[var(--granite)]">
              복지 운영 문의는 지원 채널로 연결됩니다.
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => window.open("https://github.com/aksel26", "_blank")}
              className="rounded-full bg-[var(--whisper-cream)] px-3 py-2 text-xs font-medium text-[var(--ink-black)] transition-colors hover:bg-[var(--soft-bone)]"
            >
              Github
            </button>
            <button
              type="button"
              onClick={handleEmailClick}
              className="rounded-full bg-[var(--ink-black)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-85"
            >
              Email
            </button>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`w-full ${className}`}>
      <div className="overflow-hidden rounded-[28px] bg-[var(--ink-black)] text-white">
        <div className="space-y-6 px-6 py-7">
          <div className="space-y-3">
            <p className="eyebrow-label text-white/70 before:bg-[var(--signal-orange)]">Support</p>
            <h2 className="max-w-[16rem] text-[1.9rem] leading-[1.02] tracking-[-0.04em] text-white">
              운영과 문의를
              <br />
              바로 연결합니다.
            </h2>
            <p className="max-w-[22rem] text-sm leading-6 text-white/64">
              사용자 앱에서 복지포인트, 식대, Monthly 커피, 점심조 흐름을 유지하면서 지원 채널도 바로 연결합니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open("https://github.com/aksel26", "_blank")}
              className="flex items-center justify-between rounded-[22px] bg-white/6 px-4 py-3 text-left transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                  <Image src={GithubIconSvg} alt="GitHub" width={16} height={16} />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Github
                  </p>
                  <p className="mt-1 text-sm font-medium">aksel26</p>
                </div>
              </div>
              <span className="text-lg text-white/72">↗</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleEmailClick}
              className="flex items-center justify-between rounded-[22px] bg-white/6 px-4 py-3 text-left transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                  <AtSign size={16} className="text-white" />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Email
                  </p>
                  <p className="mt-1 text-sm font-medium">hmkim@acghr.co.kr</p>
                </div>
              </div>
              <span className="text-lg text-white/72">↗</span>
            </motion.button>
          </div>

          <div className="divider bg-white/10" />

          <div className="flex items-center justify-between gap-4 text-xs text-white/58">
            <span>© {currentYear} ACG Welfare Service</span>
            <span className="rounded-full border border-white/12 px-3 py-1.5 text-white/72">
              KO • User
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
