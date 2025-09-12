"use client";

import { Card } from "@repo/ui/src/card";
import { Button } from "@repo/ui/src/button";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useCalculationData } from "@/hooks/use-calculation-data";
import { CalculationData } from "./types";

interface StatsSectionProps {
  userName: string;
  month: number;
  year: number;
  onDataChange?: (data: CalculationData | null) => void;
}

function CalculationResult({ userName, month, year, onDataChange }: StatsSectionProps) {
  const { data, isLoading, error, refetch } = useCalculationData(userName, month, year);

  useEffect(() => {
    onDataChange?.(data || null);
  }, [data, onDataChange]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded-md mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <div className="w-6 h-6 text-red-500">⚠️</div>
          </div>
          <p className="text-gray-600 text-sm">{error.message}</p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="text-xs rounded-full">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <span className="text-sm">데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "근무일",
      value: data.workDays,
      bg: "bg-white",
      text: "text-[#0a2165]",
    },
    {
      label: "휴일근무",
      value: data.holidayWorkDays,
      bg: "bg-white",
      text: "text-[#0a2165]",
    },
    {
      label: "휴가일",
      value: data.vacationDays,
      bg: "bg-orange-50",
      text: "text-orange-400",
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
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className={`${stat.bg} ${stat.text} rounded-xl p-4 transition-all hover:shadow-lg backdrop-blur-lg`}
        >
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.1 + 0.2 }} className={`text-2xl font-bold mb-1`}>
            {stat.value}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.1 + 0.3 }} className="text-xs font-medium">
            {stat.label}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

export default function StatsSection({ userName, month, year, onDataChange }: StatsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Card className="mb-8 p-0 border-none shadow-none bg-transparent">
        <CalculationResult userName={userName} month={month} year={year} onDataChange={onDataChange} />
      </Card>
    </motion.div>
  );
}