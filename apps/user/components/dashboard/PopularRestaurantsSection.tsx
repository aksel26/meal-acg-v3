"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import Image from "next/image";
import { usePopularRestaurants, PopularRestaurant } from "@/hooks/use-popular-restaurants";

const rankStyles = [
  "bg-[var(--ink-black)] text-white",
  "bg-[var(--whisper-cream)] text-[var(--ink-black)]",
  "bg-[var(--soft-bone)] text-[var(--ink-black)]",
];

export default function PopularRestaurantsSection() {
  const [showAll, setShowAll] = useState(false);
  const { data: popularRestaurants = [], isLoading } = usePopularRestaurants();

  const displayedRestaurants = showAll ? popularRestaurants.slice(0, 10) : popularRestaurants.slice(0, 3);
  const hasMore = popularRestaurants.length > 3;

  const handleToggle = () => {
    if (hasMore) {
      setShowAll(!showAll);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full rounded-[24px] border border-[rgba(25,28,31,0.1)] bg-white p-5">
        <div className="space-y-4">
          <div className="skeleton h-4 w-24 rounded-full" />
          <div className="skeleton h-8 w-44 rounded-full" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 w-full rounded-[16px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (popularRestaurants.length === 0) {
    return (
      <div className="h-full rounded-[24px] border border-[rgba(25,28,31,0.1)] bg-white p-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--whisper-cream)]">
          <Image src="/icons/onigiri.png" alt="restaurant" width={28} height={28} />
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-[var(--slate-gray)]">
          Restaurant
        </p>
        <h3 className="mt-2 text-base font-medium text-[var(--ink-black)]">
          아직 등록된 인기 음식점이 없습니다
        </h3>
        <p className="mt-2 text-sm text-[var(--granite)]">
          기록이 쌓이면 가장 자주 찾는 매장을 이곳에서 정리합니다.
        </p>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="h-full rounded-[24px] border border-[rgba(25,28,31,0.1)] bg-white p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--slate-gray)]">
            Top Places
          </p>
          <h3 className="mt-2 text-base font-medium text-[var(--ink-black)] lg:text-sm">
            ACG 인기 음식점
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--granite)] lg:text-xs">
            자주 선택된 매장을 확인하세요.
          </p>
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={handleToggle}
            className="shrink-0 rounded-full bg-[var(--whisper-cream)] px-3 py-2 text-xs font-medium text-[var(--ink-black)] transition-colors hover:bg-[var(--soft-bone)]"
          >
            {showAll ? "접기" : "더보기"}
          </button>
        )}
      </div>

      <motion.div
        className="mt-5 space-y-2"
        layout
        transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <AnimatePresence mode="popLayout">
          {displayedRestaurants.map((restaurant, index) => (
            <RestaurantItem
              key={restaurant.name}
              restaurant={restaurant}
              index={index}
              isCollapsing={!showAll}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}

function RestaurantItem({
  restaurant,
  index,
  isCollapsing,
}: {
  restaurant: PopularRestaurant;
  index: number;
  isCollapsing: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.1 } }}
      transition={{
        duration: isCollapsing ? 0.1 : 0.2,
        delay: isCollapsing ? 0 : index * 0.03,
        ease: [0.25, 0.46, 0.45, 0.94],
        layout: { duration: 0.12 },
      }}
      className="flex items-center gap-3 rounded-[18px] border border-[rgba(25,28,31,0.08)] bg-[var(--white)] px-3 py-3"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          rankStyles[index] ?? "bg-[var(--soft-bone)] text-[var(--ink-black)]"
        }`}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--ink-black)] lg:text-xs">
          {restaurant.name}
        </p>
        <p className="mt-1 text-xs text-[var(--slate-gray)]">
          이번 기간에 가장 자주 선택된 매장
        </p>
      </div>

      <div className="rounded-full bg-[var(--whisper-cream)] px-2.5 py-1.5 text-xs font-medium text-[var(--granite)]">
        {restaurant.count}회
      </div>
    </motion.div>
  );
}
