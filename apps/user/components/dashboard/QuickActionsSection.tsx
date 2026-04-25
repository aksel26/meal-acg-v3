"use client";

import Link from "next/link";
import { Coffee, UsersRound, Utensils, WalletCards } from "@repo/ui/icons";
import { motion } from "motion/react";

const quickActions = [
  {
    title: "복지포인트",
    description: "잔액과 사용 기록 확인",
    href: "/points",
    Icon: WalletCards,
  },
  {
    title: "식대",
    description: "일자별 식사 기록 입력",
    href: "/dashboard#meal-calendar",
    Icon: Utensils,
  },
  {
    title: "Monthly 커피",
    description: "음료 취합과 신청 관리",
    href: "/monthly",
    Icon: Coffee,
  },
  {
    title: "점심조",
    description: "조 편성과 일정 확인",
    href: "/lunch",
    Icon: UsersRound,
  },
];

export default function QuickActionsSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Welfare Hub"
      className="flex flex-col lg:h-full lg:min-h-0"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-4">
        {quickActions.map(({ title, description, href, Icon }, index) => (
          <motion.div
            key={title}
            className="lg:h-full lg:min-h-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.2 + index * 0.04,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Link
              href={href}
              className="group flex min-h-[72px] cursor-pointer items-center justify-between overflow-hidden rounded-[20px] bg-white p-3 transition-colors duration-200 hover:bg-[var(--whisper-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-black)] focus-visible:ring-offset-2 lg:h-full lg:min-h-0 lg:p-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[var(--whisper-cream)] text-[var(--ink-black)] transition-colors duration-200 group-hover:bg-white lg:h-8 lg:w-8 lg:rounded-[12px]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="truncate font-display text-base font-medium text-[var(--ink-black)] lg:text-xs">
                  {title}
                </h3>
              </div>
              <span className="ml-2 shrink-0 text-[10px] font-medium text-[var(--slate-gray)] lg:hidden">
                {description}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
