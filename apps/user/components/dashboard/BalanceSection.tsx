"use client";

import { Button } from "@repo/ui/src/button";
import { ChartPieDonut } from "@repo/ui/src/chart-pie-donut";
import { NumberTicker } from "@repo/ui/src/number-ticker";
import { Copy } from "@repo/ui/icons";
import { toast } from "@repo/ui/src/sonner";
import { motion } from "motion/react";
import { useMemo } from "react";
import { CalculationData } from "./types";

interface BalanceSectionProps {
  currentMonth: number;
  calculationData: CalculationData | null;
}

export default function BalanceSection({ currentMonth, calculationData }: BalanceSectionProps) {
  const copyAccount = () => {
    const accountNumber = "국민 005701-04-142344 ㈜에이시지알";
    navigator.clipboard
      .writeText(accountNumber)
      .then(() => {
        toast.success("계좌번호가 복사되었습니다.", {
          className: "bg-white/90 backdrop-blur-sm border-none shadow-lg",
        });
      })
      .catch((err) => {
        console.error("계좌번호 복사 실패:", err);
        toast.error("계좌번호 복사에 실패했습니다.");
      });
  };

  const balance = useMemo(() => {
    if (calculationData?.allowanceAmount !== undefined && calculationData?.totalUsed !== undefined) {
      const result = calculationData.allowanceAmount - calculationData.totalUsed;
      return {
        value: result,
        formatted: Math.abs(result).toLocaleString("ko-KR"),
        isNegative: result < 0,
      };
    }
    return null;
  }, [calculationData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="mb-6"
    >
      <div className="card-premium p-6 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[oklch(0.90_0.08_250/0.3)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[oklch(0.92_0.06_200/0.25)] rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[oklch(0.55_0.01_250)] uppercase tracking-wider mb-2">
                {currentMonth}월 잔액
              </span>
              {balance ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-baseline gap-1"
                >
                  {balance.isNegative && (
                    <span className="text-xl font-bold text-[oklch(0.55_0.20_25)]">-</span>
                  )}
                  <NumberTicker
                    className={`text-3xl font-bold tracking-tight ${
                      balance.isNegative
                        ? "text-[oklch(0.55_0.20_25)]"
                        : "text-[oklch(0.25_0.02_250)]"
                    }`}
                    value={Math.abs(balance.value)}
                  />
                  <span className={`text-lg font-semibold ${
                    balance.isNegative
                      ? "text-[oklch(0.55_0.20_25)]"
                      : "text-[oklch(0.40_0.02_250)]"
                  }`}>
                    원
                  </span>
                </motion.div>
              ) : (
                <div className="skeleton h-9 w-36 rounded-lg" />
              )}
            </div>

            {/* Copy Button */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                onClick={copyAccount}
                className="h-9 px-3 text-xs font-medium text-[oklch(0.45_0.08_250)] hover:text-[oklch(0.35_0.10_250)] hover:bg-[oklch(0.95_0.03_250)] rounded-xl gap-1.5 transition-all"
              >
                <Copy size={14} />
                계좌번호 복사
              </Button>
            </motion.div>
          </div>

          {/* Chart */}
          {calculationData ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ChartPieDonut
                availableAmount={calculationData.allowanceAmount || 0}
                totalUsed={calculationData.totalUsed || 0}
                className="relative"
              />
            </motion.div>
          ) : (
            <div className="relative h-64 rounded-2xl flex items-center justify-center">
              <div className="skeleton w-40 h-40 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
