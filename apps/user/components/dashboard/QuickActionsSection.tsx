"use client";

import Link from "next/link";
import { Coffee, UsersRound, Utensils, WalletCards } from "@repo/ui/icons";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

const quickActions = [
  {
    id: "points",
    title: "복지포인트",
    description: "잔액과 사용 기록 확인",
    href: "/points",
    Icon: WalletCards,
  },
  {
    id: "dashboard",
    title: "식대",
    description: "일자별 식사 기록 입력",
    href: "/dashboard#meal-calendar",
    Icon: Utensils,
  },
  {
    id: "monthly",
    title: "Monthly 커피",
    description: "음료 취합과 신청 관리",
    href: "/monthly",
    Icon: Coffee,
  },
  {
    id: "lunch",
    title: "점심조",
    description: "조 편성과 일정 확인",
    href: "/lunch",
    Icon: UsersRound,
  },
];

export default function QuickActionsSection({
  excludeIds = [],
}: {
  excludeIds?: string[];
}) {
  const [isMobileFloating, setIsMobileFloating] = useState(false);
  const visibleActions = quickActions.filter(
    (action) => !excludeIds.includes(action.id),
  );
  const isThreeActionLayout = visibleActions.length === 3;
  const mobileGridClass = isThreeActionLayout
    ? "grid-cols-3"
    : "grid-cols-2 sm:grid-cols-2";
  const desktopGridClass = isThreeActionLayout
    ? "lg:grid-cols-3"
    : "lg:grid-cols-4";

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(max-width: 639px) and (hover: none) and (pointer: coarse)",
    );
    const updateFloatingState = () => setIsMobileFloating(mediaQuery.matches);

    updateFloatingState();
    mediaQuery.addEventListener("change", updateFloatingState);

    return () => {
      mediaQuery.removeEventListener("change", updateFloatingState);
    };
  }, []);

  return (
    <>
      {isMobileFloating && (
        <div aria-hidden="true" className="h-[6.5rem]" />
      )}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.45,
          delay: 0.16,
          ease: [0.16, 1, 0.3, 1],
        }}
        aria-label="Welfare Hub"
        className={`mx-auto flex w-full flex-col lg:h-full lg:min-h-0 ${
          isMobileFloating
            ? "fixed inset-x-0 bottom-0 z-50 max-w-[820px] px-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
            : "static max-w-none p-0"
        }`}
      >
        <div
          className={`grid gap-2 lg:h-full lg:min-h-0 lg:flex-1 ${
            isMobileFloating
              ? "rounded-[28px] border border-white/15 bg-white/10 p-2 shadow-[0_18px_48px_rgba(25,28,31,0.05)] backdrop-blur-2xl"
              : ""
          } ${mobileGridClass} ${desktopGridClass}`}
        >
          {visibleActions.map(({ title, description, href, Icon }, index) => (
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
                className="group flex min-h-[64px] cursor-pointer items-center justify-center overflow-hidden rounded-[20px] bg-white p-2.5 transition-colors duration-200 hover:bg-[var(--whisper-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-black)] focus-visible:ring-offset-2 sm:min-h-[72px] sm:justify-between sm:p-3 lg:h-full lg:min-h-0 lg:p-2.5"
              >
                <div className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left lg:gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[var(--whisper-cream)] text-[var(--ink-black)] transition-colors duration-200 group-hover:bg-white lg:h-8 lg:w-8 lg:rounded-[12px]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="max-w-full truncate font-display text-[12px] font-medium text-[var(--ink-black)] sm:text-base lg:text-xs">
                    {title}
                  </h3>
                </div>
                <span className="ml-2 hidden shrink-0 text-[10px] font-medium text-[var(--slate-gray)] sm:inline lg:hidden">
                  {description}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </>
  );
}
