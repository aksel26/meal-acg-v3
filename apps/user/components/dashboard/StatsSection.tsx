"use client";

import { Button } from "@repo/ui/src/button";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useCalculationData } from "@/hooks/use-calculation-data";
import { CalculationData } from "./types";

interface StatsSectionProps {
  userId: string;
  month: number;
  year: number;
  onDataChange?: (data: CalculationData | null) => void;
}

function CalculationResult({ userId, month, year, onDataChange }: StatsSectionProps) {
  const { data, isLoading, error, refetch } = useCalculationData(userId, month, year);

  useEffect(() => {
    onDataChange?.(data || null);
  }, [data, onDataChange]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className="skeleton h-7 w-20 mb-2 rounded-md" />
            <div className="skeleton h-4 w-12 rounded" />
          </motion.div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-premium p-8 text-center"
      >
        <div className="w-14 h-14 bg-[oklch(0.95_0.06_25)] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-sm text-[oklch(0.45_0.01_250)] mb-4">{error.message}</p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="text-xs rounded-xl px-4 hover:bg-[oklch(0.97_0.02_250)]"
        >
          다시 시도
        </Button>
      </motion.div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="flex items-center gap-3 text-[oklch(0.50_0.01_250)]">
          <div className="w-5 h-5 border-2 border-[oklch(0.80_0.02_250)] border-t-[oklch(0.50_0.10_250)] rounded-full animate-spin" />
          <span className="text-sm">데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + "원";
  };

  const stats = [
    {
      label: "사용가능액",
      value: formatCurrency(data.allowanceAmount),
      gradient: "from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.20_270)]",
      textColor: "text-white",
      shadowColor: "shadow-[oklch(0.55_0.18_250/0.25)]",
    },
    {
      label: "사용금액",
      value: formatCurrency(data.totalUsed),
      gradient: "from-[oklch(0.72_0.14_55)] to-[oklch(0.65_0.16_45)]",
      textColor: "text-white",
      shadowColor: "shadow-[oklch(0.72_0.14_55/0.25)]",
    },
    {
      label: "잔액",
      value: formatCurrency(data.balance),
      gradient: data.balance >= 0
        ? "from-[oklch(0.68_0.16_155)] to-[oklch(0.60_0.18_165)]"
        : "from-[oklch(0.62_0.18_25)] to-[oklch(0.55_0.20_15)]",
      textColor: "text-white",
      shadowColor: data.balance >= 0
        ? "shadow-[oklch(0.68_0.16_155/0.25)]"
        : "shadow-[oklch(0.62_0.18_25/0.25)]",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          whileHover={{ y: -2, scale: 1.02 }}
          className={`rounded-2xl p-4 bg-gradient-to-br ${stat.gradient} ${stat.shadowColor} shadow-lg relative overflow-hidden`}
        >
          {/* Decorative overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.2 }}
            className={`relative text-xl sm:text-2xl font-bold mb-1.5 ${stat.textColor}`}
          >
            {stat.value}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.3 }}
            className={`relative text-xs font-medium ${stat.textColor} opacity-90`}
          >
            {stat.label}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

export default function StatsSection({ userId, month, year, onDataChange }: StatsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="mb-8"
    >
      <CalculationResult userId={userId} month={month} year={year} onDataChange={onDataChange} />
    </motion.div>
  );
}
