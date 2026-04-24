"use client";

import Link from "next/link";
import { ChevronRight, Coffee, UsersRound, Utensils, WalletCards } from "@repo/ui/icons";
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
      className="flex flex-col lg:min-h-0"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-4">
        {quickActions.map(({ title, description, href, Icon }, index) => (
          <motion.div
            key={title}
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
              className="group flex min-h-[118px] cursor-pointer flex-col justify-between rounded-[22px] border border-[rgba(25,28,31,0.1)] bg-white p-4 transition-colors duration-200 hover:border-[rgba(25,28,31,0.2)] hover:bg-[var(--whisper-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-black)] focus-visible:ring-offset-2 lg:h-full lg:min-h-0 lg:p-3"
            >
              <div className="flex items-start justify-between gap-3 lg:items-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[var(--whisper-cream)] text-[var(--ink-black)] transition-colors duration-200 group-hover:bg-white lg:h-9 lg:w-9 lg:rounded-[14px]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <ChevronRight
                  className="mt-1 h-4 w-4 text-[var(--slate-gray)] transition-colors duration-200 group-hover:text-[var(--ink-black)] lg:hidden"
                  aria-hidden="true"
                />
              </div>

              <div className="pt-4 lg:pt-2">
                <h3 className="font-display text-lg font-medium text-[var(--ink-black)] lg:text-sm">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-5 text-[var(--granite)] lg:hidden">
                  {description}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
