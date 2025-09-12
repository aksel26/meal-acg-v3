"use client";

import { Card, CardContent } from "@repo/ui/src/card";
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
        toast.success("계좌번호가 복사되었습니다.");
      })
      .catch((err) => {
        console.error("계좌번호 복사 실패:", err);
        toast.error("계좌번호 복사에 실패했습니다.");
      });
  };

  const balance = useMemo(() => {
    if (calculationData?.availableAmount && calculationData?.totalUsed !== undefined) {
      const result = calculationData.availableAmount - calculationData.totalUsed;
      return {
        value: result.toLocaleString("ko-KR"),
        isNegative: result < 0,
      };
    }
    return null;
  }, [calculationData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Card className="mb-4 border-none shadow-none">
        <CardContent className="pt-6">
          <div className="flex justify-between items-end mb-4">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{currentMonth}월 잔액</p>
              {balance ? (
                <div className="flex space-x-1">
                  <NumberTicker className={`text-2xl font-black ${balance.isNegative ? "text-red-600" : ""}`} value={Number(balance.value.replace(",", ""))} />
                  <span className="text-2xl font-black">원</span>
                </div>
              ) : (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
              )}
            </div>
            <Button variant={"ghost"} onClick={copyAccount} className="text-xs">
              <Copy fontSize={15} />
              계좌번호 복사
            </Button>
          </div>
          {calculationData ? (
            <ChartPieDonut availableAmount={calculationData.availableAmount || 0} totalUsed={calculationData.totalUsed || 0} className="relative" />
          ) : (
            <div className="relative h-64 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
              <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}