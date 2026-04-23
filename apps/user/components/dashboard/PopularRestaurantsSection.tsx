"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import Image from "next/image";
import { usePopularRestaurants, PopularRestaurant } from "@/hooks/use-popular-restaurants";

const rankStyles = [
  "bg-[var(--ink-black)] text-[var(--canvas-cream)]",
  "bg-[var(--whisper-cream)] text-[var(--ink-black)]",
  "bg-[var(--light-signal-orange)] text-white",
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
      <div className="card-premium p-6">
        <div className="space-y-4">
          <div className="skeleton h-4 w-24 rounded-full" />
          <div className="skeleton h-8 w-44 rounded-full" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 w-full rounded-[20px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (popularRestaurants.length === 0) {
    return (
      <div className="card-premium p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--soft-bone)]">
          <Image src="/icons/onigiri.png" alt="restaurant" width={28} height={28} />
        </div>
        <p className="eyebrow-label mt-4 justify-center">Restaurant</p>
        <h3 className="mt-2 text-lg font-medium tracking-[-0.03em] text-[var(--ink-black)]">
          아직 등록된 인기 음식점이 없습니다
        </h3>
        <p className="mt-2 text-sm text-[var(--granite)]">
          첫 식사 기록이 쌓이면 이곳에서 자주 가는 매장을 바로 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden rounded-[40px] bg-[var(--lifted-cream)] px-6 py-6 shadow-[var(--shadow-elevated)]"
    >
      <div className="orbit-line right-[-3rem] top-6 h-28 w-28 opacity-70" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow-label">Top Places</p>
          <h3 className="mt-2 text-[1.6rem] font-medium leading-[1.05] tracking-[-0.03em] text-[var(--ink-black)]">
            ACG 인기 음식점 랭킹
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--granite)]">
            최근 식사 기록을 기준으로 자주 찾는 매장을 정리했습니다.
          </p>
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={handleToggle}
            className="btn-secondary shrink-0 px-4 py-2 text-sm"
          >
            {showAll ? "접기" : "더보기"}
          </button>
        )}
      </div>

      <motion.div
        className="mt-6 space-y-3"
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
      className="flex items-center gap-4 rounded-[24px] border border-[rgba(20,20,19,0.06)] bg-white/70 px-4 py-3"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          rankStyles[index] ?? "bg-[var(--soft-bone)] text-[var(--ink-black)]"
        }`}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--ink-black)]">
          {restaurant.name}
        </p>
        <p className="mt-1 text-xs text-[var(--slate-gray)]">
          이번 기간에 가장 자주 선택된 매장
        </p>
      </div>

      <div className="rounded-[999px] bg-[var(--canvas-cream)] px-3 py-1.5 text-xs font-medium text-[var(--granite)]">
        {restaurant.count}회
      </div>
    </motion.div>
  );
}
