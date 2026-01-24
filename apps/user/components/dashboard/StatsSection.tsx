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
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-6 w-24 rounded" />
          </div>
          <div className="skeleton h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
        <p className="text-sm text-gray-500 mb-3">{error.message}</p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="text-xs rounded-lg px-4"
        >
          다시 시도
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString();
  };

  // 사용 비율 계산 (0~100)
  const usagePercent = data.allowanceAmount > 0
    ? Math.min(100, Math.round((data.totalUsed / data.allowanceAmount) * 100))
    : 0;

  // 잔액 상태 판단
  const isOverBudget = data.balance < 0;
  const isLowBalance = data.balance >= 0 && data.balance < data.allowanceAmount * 0.2;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 메인 잔액 표시 */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">이번 달 잔액</p>
            <div className="flex items-baseline gap-1">
              {isOverBudget && <span className="text-2xl font-bold text-red-500">-</span>}
              <span className={`text-2xl font-bold tracking-tight ${
                isOverBudget
                  ? "text-red-500"
                  : isLowBalance
                    ? "text-amber-600"
                    : "text-gray-900"
              }`}>
                {formatCurrency(data.balance)}
              </span>
              <span className={`text-sm font-medium ${
                isOverBudget
                  ? "text-red-400"
                  : isLowBalance
                    ? "text-amber-500"
                    : "text-gray-400"
              }`}>
                원
              </span>
            </div>
          </div>

          {/* 상태 뱃지 */}
          <div className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
            isOverBudget
              ? "bg-red-50 text-red-600"
              : isLowBalance
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
          }`}>
            {isOverBudget ? "초과" : isLowBalance ? "주의" : "양호"}
          </div>
        </div>

        {/* 사용량 프로그레스 바 */}
        <div className="space-y-2">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(usagePercent, 100)}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${
                isOverBudget
                  ? "bg-red-400"
                  : isLowBalance
                    ? "bg-amber-400"
                    : "bg-gray-700"
              }`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>{usagePercent}% 사용</span>
            <span>{formatCurrency(data.allowanceAmount)}원 중</span>
          </div>
        </div>
      </div>

      {/* 상세 내역 */}
      <div className="grid grid-cols-2 border-t border-gray-50">
        <div className="px-5 py-4 border-r border-gray-50">
          <p className="text-[11px] text-gray-400 mb-1">사용가능액</p>
          <p className="text-base font-semibold text-gray-700">
            {formatCurrency(data.allowanceAmount)}
            <span className="text-xs font-normal text-gray-400 ml-0.5">원</span>
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] text-gray-400 mb-1">사용금액</p>
          <p className="text-base font-semibold text-gray-700">
            {formatCurrency(data.totalUsed)}
            <span className="text-xs font-normal text-gray-400 ml-0.5">원</span>
          </p>
        </div>
      </div>

      {/* 개별식사 차감 정보 (있을 경우) */}
      {data.individualMealCount && data.individualMealCount > 0 && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              개별식사 {data.individualMealCount}회 차감
            </span>
            <span className="font-medium text-gray-600">
              -{formatCurrency(data.individualMealDeduction || 0)}원
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatsSection({ userId, month, year, onDataChange }: StatsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      <CalculationResult userId={userId} month={month} year={year} onDataChange={onDataChange} />
    </motion.div>
  );
}
