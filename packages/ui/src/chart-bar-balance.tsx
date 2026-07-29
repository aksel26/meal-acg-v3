"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { Bar, BarChart, XAxis, CartesianGrid } from "recharts";

import { CardContent } from "./card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./chart";

interface ChartBarBalanceProps {
  availableAmount?: number;
  remainingAmount?: number;
  totalUsed?: number;
  className?: string;
  chartType?: "welfare" | "activity";
}

const chartConfig = {
  used: {
    label: "사용금액",
    color: "#0a2165",
  },
  remaining: {
    label: "잔여금액",
    color: "#f3f4f6",
  },
} satisfies ChartConfig;

export function ChartBarBalance({ availableAmount = 0, totalUsed = 0, remainingAmount = 0, className, chartType }: ChartBarBalanceProps) {
  const usagePercentage = availableAmount > 0 ? (totalUsed / availableAmount) * 100 : 0;
  const clampedRemaining = Math.max(0, remainingAmount);

  const chartData = [
    { name: "사용금액", value: totalUsed, fill: "#0a2165", key: "used" },
    { name: "잔여금액", value: clampedRemaining, fill: "#e5e7eb", key: "remaining" },
  ];

  return (
    <div className={className}>
      <CardContent className="flex flex-col p-0 justify-between items-center">
        {chartType && (
          <div className="w-full mb-3">
            <h3 className="text-sm font-semibold text-gray-700">{chartType === "welfare" ? "복지포인트" : "활동비"}</h3>
          </div>
        )}

        <div className="w-full mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">사용률</span>
            <span className="text-sm font-bold text-gray-900">{usagePercentage.toFixed(1)}%</span>
          </div>
          <ChartContainer config={chartConfig} className="h-[40px] w-full [&_.recharts-cartesian-grid_line]:stroke-transparent">
            <BarChart data={[{ used: totalUsed, remaining: clampedRemaining }]} layout="vertical" barSize={24} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid horizontal={false} vertical={false} />
              <XAxis type="number" domain={[0, Math.max(availableAmount, totalUsed)]} hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => [`${Number(value).toLocaleString()}원`, name === "used" ? "사용금액" : "잔여금액"]}
                  />
                }
              />
              <Bar dataKey="used" stackId="balance" fill="#0a2165" radius={[6, 0, 0, 6]} />
              <Bar dataKey="remaining" stackId="balance" fill="#e5e7eb" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
          <div className="flex justify-between mt-1">
            {chartData.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.fill }} />
                <span className="text-xs text-gray-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between w-full space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm w-20 text-gray-400">총 금액</span>
            </div>
            <span className="font-medium text-sm">{availableAmount.toLocaleString()}원</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm w-20 text-gray-400">사용금액</span>
            </div>
            <span className="font-medium text-sm">{totalUsed.toLocaleString()}원</span>
          </div>
          <hr />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm w-20 text-gray-400">잔여금액</span>
            </div>
            <span className="font-medium text-sm">{remainingAmount.toLocaleString()}원</span>
          </div>
          <div className="flex items-center gap-2 leading-none font-medium text-xs pt-2 justify-end">
            {remainingAmount >= 0 ? (
              <>
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-green-600">예산 내 사용 중</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 text-red-600" />
                <span className="text-red-600">예산 초과 {Math.abs(remainingAmount).toLocaleString()}원</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
}
