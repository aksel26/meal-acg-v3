"use client";

import Link from "next/link";
import { Coffee, UsersRound, Utensils, WalletCards } from "@repo/ui/icons";

const quickActions = [
  {
    id: "dashboard",
    title: "식대",
    description: "일자별 식사 기록 입력",
    href: "/dashboard#meal-calendar",
    Icon: Utensils,
  },
  {
    id: "points",
    title: "복지포인트",
    // 좁은 화면에서 두 줄로 나눌 위치
    lines: ["복지", "포인트"],
    description: "잔액과 사용 기록 확인",
    href: "/points",
    Icon: WalletCards,
  },
  {
    id: "lunch",
    title: "점심조",
    description: "조 편성과 일정 확인",
    href: "/lunch",
    Icon: UsersRound,
  },
  {
    id: "monthly",
    title: "Monthly커피",
    lines: ["Monthly", "커피"],
    description: "음료 취합과 신청 관리",
    href: "/monthly",
    Icon: Coffee,
  },
];

export default function QuickActionsSection() {
  return (
    <section
      aria-label="Welfare Hub"
      className="mx-auto flex w-full max-w-none flex-col p-0 lg:h-full lg:min-h-0"
    >
      <div
        className="grid grid-cols-4 gap-2 rounded-[28px] border border-white/15 bg-white/10 p-2 shadow-[0_18px_48px_rgba(25,28,31,0.05)] backdrop-blur-2xl lg:h-full lg:min-h-0 lg:flex-1"
      >
        {quickActions.map(({ title, lines, description, href, Icon }) => (
          <div key={title} className="lg:h-full lg:min-h-0">
            <Link
              href={href}
              className="group flex min-h-[64px] cursor-pointer items-center justify-center overflow-hidden rounded-[20px] bg-white p-2 transition-colors duration-200 hover:bg-[var(--whisper-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-black)] focus-visible:ring-offset-2 sm:min-h-[72px] sm:justify-between sm:p-3 lg:h-full lg:min-h-0 lg:p-2.5"
            >
              <div className="flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row sm:gap-1.5 sm:text-left lg:gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] sm:h-9 sm:w-9 bg-[var(--whisper-cream)] text-[var(--ink-black)] transition-colors duration-200 group-hover:bg-white lg:h-8 lg:w-8 lg:rounded-[12px]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                {/* 잘림 대신 정해 둔 위치에서만 줄바꿈한다 (break-keep + wbr) */}
                <h3 className="max-w-full break-keep font-display text-xs font-medium leading-tight text-[var(--ink-black)] sm:text-base lg:text-xs">
                  {lines
                    ? lines.map((part, i) => (
                        <span key={part}>
                          {i > 0 && <wbr />}
                          {part}
                        </span>
                      ))
                    : title}
                </h3>
              </div>
              <span className="ml-2 hidden shrink-0 text-[10px] font-medium text-[var(--slate-gray)]">
                {description}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
