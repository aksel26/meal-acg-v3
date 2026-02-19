"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import Image from "next/image";
import { usePopularRestaurants, PopularRestaurant } from "@/hooks/use-popular-restaurants";

const medalColors = [
  { bg: "bg-gradient-to-br from-amber-300 to-yellow-500", text: "text-amber-900", shadow: "shadow-amber-300/50" },
  { bg: "bg-gradient-to-br from-slate-300 to-slate-400", text: "text-slate-700", shadow: "shadow-slate-300/50" },
  { bg: "bg-gradient-to-br from-orange-300 to-orange-500", text: "text-orange-900", shadow: "shadow-orange-300/50" },
];

const rankEmojis = ["🥇", "🥈", "🥉"];

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="card-premium p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="skeleton h-5 w-32 rounded" />
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="skeleton h-4 w-32 rounded" />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (popularRestaurants.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="card-premium p-5 text-center relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[oklch(0.95_0.12_80/0.4)] rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[oklch(0.92_0.08_60/0.3)] rounded-full blur-2xl" />

          <div className="relative flex flex-col items-center justify-center gap-2">
            <Image src="/icons/onigiri.png" alt="restaurant" width={32} height={32} className="opacity-50" />
            <h3 className="text-sm font-semibold text-gray-800">ACG 인기 음식점 랭킹</h3>
            <p className="text-xs text-gray-500">아직 등록된 음식점이 없습니다</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-6"
    >
      <motion.button
        type="button"
        className={`card-premium p-5 relative overflow-hidden w-full text-left ${
          hasMore ? "cursor-pointer active:scale-[0.99]" : "cursor-default"
        }`}
        onClick={handleToggle}
        whileTap={hasMore ? { scale: 0.99 } : undefined}
        transition={{ duration: 0.15 }}
        disabled={!hasMore}
        aria-expanded={hasMore ? showAll : undefined}
        aria-label={hasMore ? (showAll ? "음식점 랭킹 접기" : "음식점 랭킹 더보기") : undefined}
      >
        {/* Decorative Elements */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[oklch(0.95_0.12_80/0.4)] rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[oklch(0.92_0.08_60/0.3)] rounded-full blur-2xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Image src="/icons/onigiri.png" alt="restaurant" width={24} height={24} />
            </motion.div>
            <h3 className="text-sm font-semibold text-gray-800">ACG 인기 음식점 랭킹</h3>
          </div>
          {hasMore && (
            <motion.div
              className="flex items-center gap-1 text-xs text-gray-400"
              animate={{ opacity: 1 }}
            >
              <span>{showAll ? "접기" : "더보기"}</span>
              <motion.svg
                animate={{ rotate: showAll ? 180 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </motion.div>
          )}
        </div>

        {/* Restaurant List */}
        <motion.div
          className="relative space-y-2.5"
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
      </motion.button>
    </motion.div>
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
  const isTopThree = index < 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.1, delay: 0 } }}
      transition={{
        duration: isCollapsing ? 0.1 : 0.2,
        delay: isCollapsing ? 0 : index * 0.03,
        ease: [0.25, 0.46, 0.45, 0.94],
        layout: { duration: 0.12 },
      }}
      className="flex items-center gap-3"
    >
      {/* Rank Badge */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
          delay: index * 0.03,
        }}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
          ${isTopThree && medalColors[index] ? `${medalColors[index].bg} ${medalColors[index].text} shadow-md ${medalColors[index].shadow}` : "bg-gray-100 text-gray-500"}
        `}
      >
        {isTopThree ? rankEmojis[index] : index + 1}
      </motion.div>

      {/* Restaurant Info */}
      <div className="flex-1 min-w-0 flex items-center justify-between">
        <span className={`text-sm font-medium truncate ${isTopThree ? "text-gray-800" : "text-gray-600"}`}>
          {restaurant.name}
        </span>
        <span className="text-xs font-semibold text-gray-500 shrink-0 ml-2">{restaurant.count}회</span>
      </div>
    </motion.div>
  );
}
